import type { AppConfig, RunRecord } from "../domain/types.js";
import type { WorkflowExecutionResult, WorkflowProvider } from "./provider.js";
export declare class OpenSpecWorkflowProvider implements WorkflowProvider {
    private readonly config;
    readonly id: "openspec";
    constructor(config: AppConfig);
    prepareRun(run: RunRecord): Promise<WorkflowExecutionResult>;
    finalizeRun(run: RunRecord): Promise<WorkflowExecutionResult>;
    buildPromptContext(run: RunRecord): string[];
    private buildChangeName;
    private executeCommand;
    private parseJson;
    private tryParseJson;
    private extractLastJsonBlock;
    private describeStatus;
}
