import type { AppConfig, HandoffArtifact, RunRecord } from "../domain/types.js";
export declare class GitHubProvider {
    private readonly config;
    constructor(config: AppConfig);
    buildHandoff(run: RunRecord): Promise<HandoffArtifact>;
    writeHandoff(run: RunRecord): Promise<HandoffArtifact>;
    publishHandoff(run: RunRecord): Promise<{
        status: "published" | "skipped" | "failed";
        detail: string;
    }>;
    private resolveGitHubRepository;
    private resolveCommitSha;
}
