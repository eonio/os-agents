import { approveAll, CopilotClient, type SessionEvent } from "@github/copilot-sdk";
import type { AppConfig, RunRecord } from "../domain/types.js";
import { RunLogger } from "../state/run-logger.js";
import { HANS_PROFILE, getDeveloperPersona } from "../team/personas.js";

export function isAuthorizationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Authorization error") || message.includes("/login");
}

function buildPrompt(run: RunRecord): string {
  const repositoryLabel =
    run.repository.owner && run.repository.name
      ? `${run.repository.owner}/${run.repository.name}`
      : run.repository.input;

  const persona =
    run.kind === "developer" && run.personaId ? getDeveloperPersona(run.personaId) : HANS_PROFILE;

  const teamLines =
    run.kind === "orchestrator"
      ? [
          "Team mode: Hans final implementation.",
          ...(run.team?.memberResults.length
            ? ["Developer results:", ...run.team.memberResults.map((member) => `- ${member.name}: ${member.summary ?? "No summary."}`)]
            : []),
          ...(run.team?.finalAgreement
            ? [
                "Accepted team agreement:",
                run.team.finalAgreement.summary,
                `Agreement score: ${run.team.finalAgreement.score}/100.`,
                `Agreement strategy: ${run.team.finalAgreement.strategy}.`,
                ...(run.team.finalAgreement.selectedPersonaName
                  ? [`Fallback source: ${run.team.finalAgreement.selectedPersonaName}.`]
                  : []),
              ]
            : []),
        ]
      : [
          `You are ${persona.name}, one of five parallel fullstack developers on Hans's team.`,
          `Persona title: ${persona.title}.`,
          `Working style: ${persona.style}`,
          `Contribution focus: ${persona.valueFocus}`,
          `Humorous internal monologue: ${persona.internalMonologue}`,
          "You still explore and contribute as a fullstack developer, not as a narrow specialist.",
        ];

  return [
    "You are one of several parallel coding agents managed by OS Agents.",
    `Current role: ${persona.name} (${persona.title}).`,
    persona.summary,
    `Internal monologue cue: ${persona.internalMonologue}`,
    `Repository: ${repositoryLabel}`,
    `Workspace: ${run.workspacePath}`,
    `Base branch: ${run.baseBranch}`,
    `Feature branch: ${run.featureBranch}`,
    `Feature request: ${run.feature}`,
    "",
    "Required workflow:",
    "1. Inspect the repository in the workspace and understand the feature scope.",
    `2. Follow the ${run.workflow.provider} workflow artifacts or commands already prepared in the repository.`,
    "3. Implement only the assigned feature in this workspace.",
    "4. Leave the repository on the feature branch with local changes committed only if explicitly requested by the operator.",
    "5. End with a concise handoff containing changed files, important decisions, and suggested next steps for CI/CD.",
    "",
    ...teamLines,
    "",
    `Workflow provider: ${run.workflow.provider}`,
    ...(run.workflow.changeName ? [`Workflow change: ${run.workflow.changeName}`] : []),
    ...(run.workflow.changeDirectory ? [`Workflow change directory: ${run.workflow.changeDirectory}`] : []),
    ...(run.workflow.lastStatusSummary ? [`Workflow status: ${run.workflow.lastStatusSummary}`] : []),
    "",
    "Never modify files outside the provided workspace.",
  ].join("\n");
}

function describeEvent(event: SessionEvent): string | undefined {
  switch (event.type) {
    case "assistant.message":
      return `assistant: ${event.data.content}`;
    case "assistant.message_delta":
      return undefined;
    case "tool.execution_start":
      return `tool start: ${event.data.toolName}`;
    case "tool.execution_complete":
      return `tool done: ${event.data.toolDescription?.name ?? event.data.toolCallId} (${event.data.success ? "success" : "failed"})`;
    case "session.error":
      return `session error: ${event.data.message}`;
    default:
      return undefined;
  }
}

export class CopilotProvider {
  public constructor(private readonly config: AppConfig) {}

  private async runSession(
    run: RunRecord,
    logger: RunLogger,
    options: { gitHubToken?: string; useLoggedInUser: boolean },
  ): Promise<{
    sessionId: string;
    summary?: string;
  }> {
    const client = new CopilotClient({
      workingDirectory: run.workspacePath,
      baseDirectory: this.config.copilot.baseDirectory,
      logLevel: this.config.copilot.logLevel,
      gitHubToken: options.gitHubToken,
      useLoggedInUser: options.useLoggedInUser,
      enableRemoteSessions: this.config.copilot.remoteSessionMode !== "off",
    });

    await client.start();

    try {
      const sessionConfig = {
        model: this.config.copilot.model,
        workingDirectory: run.workspacePath,
        onPermissionRequest: approveAll,
        streaming: true,
        remoteSession: this.config.copilot.remoteSessionMode,
        gitHubToken: options.gitHubToken,
        infiniteSessions: { enabled: true },
      } as const;

      const session = run.integration.copilotSessionId
        ? await client.resumeSession(run.integration.copilotSessionId, sessionConfig)
        : await client.createSession({
            sessionId: run.id,
            ...sessionConfig,
          });

      session.on((event) => {
        const line = describeEvent(event);
        if (line) {
          void logger.log(line);
        }
      });

      const finalMessage = await session.sendAndWait({ prompt: buildPrompt(run) }, 30 * 60 * 1000);
      const summary = finalMessage?.data.content?.trim();

      await session.disconnect();
      return {
        sessionId: session.sessionId,
        summary,
      };
    } finally {
      await client.stop();
    }
  }

  public async implement(run: RunRecord, logger: RunLogger): Promise<{
    sessionId: string;
    summary?: string;
  }> {
    try {
      return await this.runSession(run, logger, {
        gitHubToken: this.config.github.token,
        useLoggedInUser: !this.config.github.token,
      });
    } catch (error) {
      if (!this.config.github.token || !isAuthorizationError(error)) {
        throw error;
      }

      await logger.log(
        "GitHub token authorization failed for Copilot SDK; retrying with the logged-in Copilot user.",
      );

      return this.runSession(run, logger, {
        useLoggedInUser: true,
      });
    }
  }
}
