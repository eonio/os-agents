import type { AppConfig, HandoffArtifact, RepositoryRef, RunRecord } from "../domain/types.js";
export declare class GitHubProvider {
    private readonly config;
    constructor(config: AppConfig);
    resolveRepository(input: string): RepositoryRef;
    buildHandoff(run: RunRecord): Promise<HandoffArtifact>;
    writeHandoff(run: RunRecord): Promise<HandoffArtifact>;
    publishHandoff(run: RunRecord): Promise<{
        status: string;
        detail: string;
    }>;
    private resolveCommitSha;
}
