import type { ActivePhase, AppConfig, RunRecord, WorkflowPhase } from "../domain/types.js";
export declare class RunStore {
    private readonly config;
    constructor(config: AppConfig);
    getRunPath(runId: string): string;
    listRuns(): Promise<RunRecord[]>;
    getRun(runId: string): Promise<RunRecord>;
    saveRun(run: RunRecord): Promise<RunRecord>;
    updateRun(runId: string, mutate: (run: RunRecord) => RunRecord | void): Promise<RunRecord>;
    transitionPhase(runId: string, nextPhase: WorkflowPhase, message?: string): Promise<RunRecord>;
    reopenRun(runId: string, resumePhase: ActivePhase, message?: string): Promise<RunRecord>;
    deleteRun(runId: string): Promise<void>;
    private normalizeRun;
}
