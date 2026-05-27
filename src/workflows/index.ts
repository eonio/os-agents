import type { AppConfig, RunRecord } from "../domain/types.js";
import type { WorkflowProvider } from "./provider.js";
import { OpenSpecWorkflowProvider } from "./openspec-provider.js";
import { SpeckitWorkflowProvider } from "./speckit-provider.js";

export function createWorkflowProvider(config: AppConfig, run?: Pick<RunRecord, "workflow">): WorkflowProvider {
  const providerId = run?.workflow.provider ?? config.workflow.defaultProvider;
  switch (providerId) {
    case "speckit":
      return new SpeckitWorkflowProvider(config);
    case "openspec":
    default:
      return new OpenSpecWorkflowProvider(config);
  }
}
