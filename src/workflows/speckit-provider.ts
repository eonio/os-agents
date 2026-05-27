import type { AppConfig, RunRecord } from "../domain/types.js";
import { renderTemplate } from "../utils/text.js";
import { execShell } from "../utils/process.js";
import type { WorkflowExecutionResult, WorkflowProvider } from "./provider.js";

export class SpeckitWorkflowProvider implements WorkflowProvider {
  public readonly id = "speckit" as const;

  public constructor(private readonly config: AppConfig) {}

  public async prepareRun(run: RunRecord): Promise<WorkflowExecutionResult> {
    const logOutput = await this.runConfiguredStage(this.config.workflow.speckit.draftCommand, run);
    return {
      logOutput,
      workflow: {
        provider: this.id,
        lastStatusSummary: "Speckit draft stage executed.",
      },
    };
  }

  public async finalizeRun(run: RunRecord): Promise<WorkflowExecutionResult> {
    const logOutput = await this.runConfiguredStage(this.config.workflow.speckit.handoffCommand, run);
    return {
      logOutput,
      workflow: {
        provider: this.id,
        lastStatusSummary: "Speckit handoff stage executed.",
      },
    };
  }

  public buildPromptContext(run: RunRecord): string[] {
    return [
      "Current workflow provider: Speckit.",
      "Follow the Speckit workflow artifacts or commands already prepared in the repository before finalizing implementation.",
      `Assigned feature request: ${run.feature}`,
    ];
  }

  private async runConfiguredStage(template: string, run: RunRecord): Promise<string> {
    const command = renderTemplate(template, {
      runId: run.id,
      feature: run.feature,
      featureBranch: run.featureBranch,
      baseBranch: run.baseBranch,
      repository: run.repository.input,
      workspacePath: run.workspacePath,
      changeName: run.workflow.changeName ?? "",
    });
    const result = await execShell(command, { cwd: run.workspacePath });
    return [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join("\n");
  }
}
