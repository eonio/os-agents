import type { AppConfig, RunRecord, WorkflowProviderId, WorkflowState } from "../domain/types.js";

export interface WorkflowExecutionResult {
  workflow: WorkflowState;
  logOutput?: string;
}

export interface WorkflowProvider {
  readonly id: WorkflowProviderId;
  prepareRun(run: RunRecord): Promise<WorkflowExecutionResult>;
  finalizeRun(run: RunRecord): Promise<WorkflowExecutionResult>;
  buildPromptContext(run: RunRecord): string[];
}

export type WorkflowProviderFactory = (config: AppConfig) => WorkflowProvider;
