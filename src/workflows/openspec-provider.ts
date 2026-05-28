import { stat } from "node:fs/promises";
import path from "node:path";
import type { AppConfig, RunRecord, WorkflowProgress } from "../domain/types.js";
import { execShell } from "../utils/process.js";
import { renderTemplate } from "../utils/text.js";
import type { WorkflowExecutionResult, WorkflowProvider } from "./provider.js";

interface OpenSpecStatusResponse {
  changeName: string;
  schemaName?: string;
  isComplete?: boolean;
  artifacts?: Array<{ id: string; status: string }>;
}

interface OpenSpecApplyResponse {
  state?: string;
  progress?: WorkflowProgress;
  changeDir?: string;
  instruction?: string;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export class OpenSpecWorkflowProvider implements WorkflowProvider {
  public readonly id = "openspec" as const;

  public constructor(private readonly config: AppConfig) {}

  public async prepareRun(run: RunRecord): Promise<WorkflowExecutionResult> {
    const changeName = run.workflow.changeName ?? this.buildChangeName(run);
    const changeDirectory = path.join(run.workspacePath, "openspec", "changes", changeName);
    const outputs: string[] = [];

    if (!(await pathExists(changeDirectory))) {
      outputs.push(
        await this.executeCommand(this.config.workflow.openspec.createChangeCommand, run, changeName),
      );
    }

    const statusOutput = await this.executeCommand(
      this.config.workflow.openspec.statusCommand,
      run,
      changeName,
    );
    const status = this.parseJson<OpenSpecStatusResponse>(statusOutput);

    const applyOutput = await this.executeCommand(
      this.config.workflow.openspec.applyCommand,
      run,
      changeName,
    );
    const apply = this.parseJson<OpenSpecApplyResponse>(applyOutput);

    outputs.push(statusOutput, applyOutput);

    return {
      logOutput: outputs.filter(Boolean).join("\n"),
      workflow: {
        provider: this.id,
        changeName,
        changeDirectory: apply.changeDir ?? changeDirectory,
        applyState: apply.state ?? (status.isComplete ? "all_done" : "ready"),
        progress: apply.progress,
        lastStatusSummary: apply.instruction ?? this.describeStatus(status, apply),
      },
    };
  }

  public async finalizeRun(run: RunRecord): Promise<WorkflowExecutionResult> {
    const changeName = run.workflow.changeName ?? this.buildChangeName(run);
    const output = await this.executeCommand(
      this.config.workflow.openspec.handoffCommand,
      run,
      changeName,
    );
    const status = this.tryParseJson<OpenSpecStatusResponse>(output);

    return {
      logOutput: output,
      workflow: {
        provider: this.id,
        changeName,
        changeDirectory:
          run.workflow.changeDirectory ?? path.join(run.workspacePath, "openspec", "changes", changeName),
        applyState: status?.isComplete ? "all_done" : run.workflow.applyState,
        progress: run.workflow.progress,
        lastStatusSummary: status
          ? this.describeStatus(status, undefined)
          : "OpenSpec post-implementation step executed.",
      },
    };
  }

  public buildPromptContext(run: RunRecord): string[] {
    const changeName = run.workflow.changeName ?? this.buildChangeName(run);
    return [
      "Current workflow provider: OpenSpec.",
      `OpenSpec change: ${changeName}.`,
      run.workflow.changeDirectory
        ? `OpenSpec change directory: ${run.workflow.changeDirectory}.`
        : "OpenSpec change directory will live under openspec/changes/<change-name>.",
      "Before making code changes, inspect the PRD and the OpenSpec change state.",
      `Use commands such as \`openspec status --change "${changeName}" --json\` and \`openspec instructions apply --change "${changeName}" --json\` to understand what remains.`,
      `Treat the PRD at "${run.prd?.workspaceFilePath ?? run.prd?.filePath ?? "features/<feature>.md"}" as the source of truth for scope and architecture.`,
      "If proposal, design, specs, or tasks are incomplete, align them to the PRD before finalizing implementation.",
    ];
  }

  private buildChangeName(run: RunRecord): string {
    return `${this.config.workflow.openspec.changePrefix}-${run.featureSlug}-${run.id.slice(-8)}`;
  }

  private async executeCommand(template: string, run: RunRecord, changeName: string): Promise<string> {
    const command = renderTemplate(template, {
      runId: run.id,
      feature: run.feature,
      featureBranch: run.featureBranch,
      baseBranch: run.baseBranch,
      repository: this.config.projectRoot,
      projectRoot: this.config.projectRoot,
      workspacePath: run.workspacePath,
      changeName,
    });
    const result = await execShell(command, { cwd: run.workspacePath });
    return [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join("\n");
  }

  private parseJson<T>(output: string): T {
    const jsonBlock = this.extractLastJsonBlock(output);
    return JSON.parse(jsonBlock) as T;
  }

  private tryParseJson<T>(output: string): T | undefined {
    try {
      return this.parseJson<T>(output);
    } catch {
      return undefined;
    }
  }

  private extractLastJsonBlock(output: string): string {
    const start = output.indexOf("{");
    const end = output.lastIndexOf("}");
    if (start < 0 || end < start) {
      throw new Error(`Expected JSON output from OpenSpec command, received: ${output}`);
    }
    return output.slice(start, end + 1);
  }

  private describeStatus(status?: OpenSpecStatusResponse, apply?: OpenSpecApplyResponse): string {
    if (apply?.state) {
      const progress = apply.progress
        ? `${apply.progress.complete}/${apply.progress.total} tasks complete`
        : "progress unavailable";
      return `OpenSpec apply state: ${apply.state} (${progress}).`;
    }

    if (status?.artifacts) {
      const done = status.artifacts.filter((artifact) => artifact.status === "done").length;
      return `OpenSpec artifacts complete: ${done}/${status.artifacts.length}.`;
    }

    return "OpenSpec workflow prepared.";
  }
}
