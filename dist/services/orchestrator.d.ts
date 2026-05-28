import type { AppConfig, RunRecord, SpawnRequest, SpawnResult } from "../domain/types.js";
export declare class OrchestratorService {
    private readonly config;
    private readonly options;
    private readonly store;
    private readonly github;
    private readonly workspaceManager;
    private readonly copilot;
    private readonly deliberation;
    private readonly prd;
    constructor(config: AppConfig, options?: {
        liveOutput?: boolean;
    });
    spawnRuns(request: SpawnRequest): Promise<SpawnResult>;
    listRuns(): Promise<RunRecord[]>;
    getRun(runId: string): Promise<RunRecord>;
    cancelRun(runId: string): Promise<RunRecord>;
    resumeRun(runId: string): Promise<RunRecord>;
    getLogs(runId: string, tail?: number): Promise<string[]>;
    cleanupRun(runId: string): Promise<void>;
    runWorker(runId: string): Promise<void>;
    private runHansWorker;
    private runCouncilLoop;
    private collectContributions;
    private moderateItem;
    private buildContributionPrompt;
    private buildModerationPrompt;
    private buildPrdPrompt;
    private ensurePhase;
    private resolveBaseBranch;
    private announce;
}
