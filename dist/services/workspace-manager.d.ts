import type { AppConfig, RunRecord } from "../domain/types.js";
export declare class WorkspaceManager {
    private readonly config;
    constructor(config: AppConfig);
    prepareWorkspace(run: RunRecord): Promise<RunRecord>;
    prepareWorkspaceAt(run: RunRecord, workspacePath: string): Promise<RunRecord>;
    cleanup(run: RunRecord): Promise<void>;
    getWorkspacePath(runId: string): string;
    private isGitRepository;
    private hasCommitHistory;
}
