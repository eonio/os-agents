import type { AppConfig, RunRecord } from "../domain/types.js";
import type { WorkflowProvider } from "./provider.js";
export declare function createWorkflowProvider(config: AppConfig, run?: Pick<RunRecord, "workflow">): WorkflowProvider;
