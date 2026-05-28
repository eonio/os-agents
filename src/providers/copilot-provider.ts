import { approveAll, CopilotClient, type SessionEvent } from "@github/copilot-sdk";
import type { AppConfig, RunRecord } from "../domain/types.js";
import { RunLogger } from "../state/run-logger.js";
import { HANS_PROFILE } from "../team/personas.js";
import { createWorkflowProvider } from "../workflows/index.js";

const DEFAULT_MODEL = "gpt-5.4";

export function isAuthorizationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Authorization error") || message.includes("/login");
}

export function isMissingAuthenticationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Session was not created with authentication info or custom provider");
}

export function isModelUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Model "') && message.includes('" is not available');
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

function buildImplementationPrompt(config: AppConfig, run: RunRecord): string {
  const workflowProvider = createWorkflowProvider(config, run);

  return [
    "You are Hans, the OS Agents orchestrator and AI builder expert.",
    `Project root: ${config.projectRoot}`,
    `Workspace: ${run.workspacePath}`,
    `Base branch: ${run.baseBranch}`,
    `Feature branch: ${run.featureBranch}`,
    `Feature request: ${run.feature}`,
    "",
    "The council phase is complete.",
    `Final PRD path: ${run.prd?.workspaceFilePath ?? run.prd?.filePath ?? "missing"}`,
    `PRD title: ${run.prd?.title ?? run.feature}`,
    `PRD version: ${run.prd?.version ?? "1.0.0"}`,
    `PRD date: ${run.prd?.date ?? "unknown"}`,
    ...(run.prd?.synopsis ? [`PRD synopsis: ${run.prd.synopsis}`] : []),
    "",
    "Implementation rules:",
    "1. Read the PRD before changing code.",
    "2. Use the OpenSpec workflow artifacts prepared in this workspace.",
    "3. Implement only what the PRD approves.",
    "4. Keep the project on the feature branch.",
    "5. End with a concise implementation handoff listing changed files, key decisions, and next steps.",
    "",
    ...workflowProvider.buildPromptContext(run),
    "",
    `Current role: ${HANS_PROFILE.name} (${HANS_PROFILE.title}).`,
    HANS_PROFILE.summary,
    `Operating style: ${HANS_PROFILE.style}`,
    `Decision focus: ${HANS_PROFILE.valueFocus}`,
    "",
    "Never modify files outside the provided workspace.",
  ].join("\n");
}

export class CopilotProvider {
  public constructor(private readonly config: AppConfig) {}

  private async runSession(
    run: RunRecord,
    logger: RunLogger,
    options: {
      prompt: string;
      sessionId: string;
      resumeSessionId?: string;
      gitHubToken?: string;
      useLoggedInUser: boolean;
      model: string;
      baseDirectory?: string;
    },
  ): Promise<{
    sessionId: string;
    response?: string;
  }> {
    const client = new CopilotClient({
      workingDirectory: run.workspacePath,
      baseDirectory: options.baseDirectory,
      logLevel: this.config.copilot.logLevel,
      gitHubToken: options.gitHubToken,
      useLoggedInUser: options.useLoggedInUser,
      enableRemoteSessions: this.config.copilot.remoteSessionMode !== "off",
    });

    await client.start();

    try {
      const sessionConfig = {
        model: options.model,
        workingDirectory: run.workspacePath,
        onPermissionRequest: approveAll,
        streaming: true,
        remoteSession: this.config.copilot.remoteSessionMode,
        gitHubToken: options.gitHubToken,
        infiniteSessions: { enabled: true },
      } as const;

      const session = options.resumeSessionId
        ? await client.resumeSession(options.resumeSessionId, sessionConfig)
        : await client.createSession({
            sessionId: options.sessionId,
            ...sessionConfig,
          });

      session.on((event) => {
        const line = describeEvent(event);
        if (line) {
          void logger.log(line);
        }
      });

      const finalMessage = await session.sendAndWait(
        { prompt: options.prompt },
        30 * 60 * 1000,
      );
      const response = finalMessage?.data.content?.trim();

      await session.disconnect();
      return {
        sessionId: session.sessionId,
        response,
      };
    } finally {
      await client.stop();
    }
  }

  public async sendPrompt(
    run: RunRecord,
    logger: RunLogger,
    prompt: string,
    sessionId: string,
    resumeSessionId?: string,
  ): Promise<{
    sessionId: string;
    response?: string;
  }> {
    try {
      return await this.runSession(run, logger, {
        prompt,
        sessionId,
        resumeSessionId,
        gitHubToken: this.config.github.token,
        useLoggedInUser: !this.config.github.token,
        model: this.config.copilot.model,
        baseDirectory: this.config.copilot.baseDirectory,
      });
    } catch (error) {
      if (!this.config.github.token && this.config.copilot.baseDirectory && isMissingAuthenticationError(error)) {
        await logger.log(
          "Project-local Copilot auth state is empty; retrying with the user's default Copilot login.",
        );

        return this.runSession(run, logger, {
          prompt,
          sessionId,
          resumeSessionId,
          useLoggedInUser: true,
          model: this.config.copilot.model,
        });
      }

      if (this.config.github.token && isAuthorizationError(error)) {
        await logger.log(
          "GitHub token authorization failed for Copilot SDK; retrying with the logged-in Copilot user.",
        );

        return this.runSession(run, logger, {
          prompt,
          sessionId,
          resumeSessionId,
          useLoggedInUser: true,
          model: this.config.copilot.model,
        });
      }

      if (this.config.copilot.model !== DEFAULT_MODEL && isModelUnavailableError(error)) {
        await logger.log(
          `Configured Copilot model "${this.config.copilot.model}" is unavailable; retrying with "${DEFAULT_MODEL}".`,
        );

        return this.runSession(run, logger, {
          prompt,
          sessionId,
          resumeSessionId,
          gitHubToken: this.config.github.token,
          useLoggedInUser: !this.config.github.token,
          model: DEFAULT_MODEL,
          baseDirectory: this.config.copilot.baseDirectory,
        });
      }

      throw error;
    }
  }

  public async implement(
    run: RunRecord,
    logger: RunLogger,
  ): Promise<{
    sessionId: string;
    summary?: string;
  }> {
    const result = await this.sendPrompt(
      run,
      logger,
      buildImplementationPrompt(this.config, run),
      run.id,
      run.integration.copilotSessionId,
    );

    return {
      sessionId: result.sessionId,
      summary: result.response,
    };
  }
}
