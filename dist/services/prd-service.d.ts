import type { AppConfig, CouncilDecision, PrdState, RunRecord } from "../domain/types.js";
export declare class PrdService {
    private readonly config;
    constructor(config: AppConfig);
    normalizeDocument(markdown: string): string;
    createInitialState(run: RunRecord): PrdState;
    writeDocument(prd: PrdState, markdown: string): Promise<void>;
    syncDocumentToWorkspace(run: RunRecord, prd: PrdState, markdown: string): Promise<string>;
    validateDocument(markdown: string): void;
    resolveDocument(run: Pick<RunRecord, "createdAt" | "workspacePath">, prd: Pick<PrdState, "filePath">, response?: string): Promise<string>;
    buildFinalSynopsis(decisions: CouncilDecision[]): string;
    buildArc42Checklist(): string[];
    private wasUpdatedForRun;
    private buildDiscussionItems;
}
