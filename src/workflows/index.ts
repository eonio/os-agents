import type { AppConfig, RunRecord } from "../domain/types.js";
import type { WorkflowProvider } from "./provider.js";
import { OpenSpecWorkflowProvider } from "./openspec-provider.js";

export function createWorkflowProvider(
  config: AppConfig,
  _run?: Pick<RunRecord, "workflow">,
): WorkflowProvider {
  return new OpenSpecWorkflowProvider(config);
}
