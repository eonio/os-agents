import type { AppConfig, CouncilDecision, PrdState, RunRecord } from "../domain/types.js";
export declare class PrdService {
    private readonly config;
    constructor(config: AppConfig);
    createInitialState(run: RunRecord): PrdState;
    writeDocument(prd: PrdState, markdown: string): Promise<void>;
    syncDocumentToWorkspace(run: RunRecord, prd: PrdState, markdown: string): Promise<string>;
    validateDocument(markdown: string): void;
    buildFinalSynopsis(decisions: CouncilDecision[]): string;
    buildArc42Checklist(): string[];
    private buildDiscussionItems;
}
