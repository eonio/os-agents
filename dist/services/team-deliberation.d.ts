import type { CouncilContribution, CouncilDecision, PrdDiscussionItem, TeamMemberResult } from "../domain/types.js";
export declare class TeamDeliberationService {
    buildDiscussionSnapshot(item: PrdDiscussionItem, contributions: CouncilContribution[]): string;
    createContribution(item: PrdDiscussionItem, personaId: string, name: string, round: 1 | 2, content: string): CouncilContribution;
    createDecision(item: PrdDiscussionItem, roundsUsed: 1 | 2, summary: string, followUpPrompt?: string): CouncilDecision;
    createMemberResults(contributions: CouncilContribution[]): TeamMemberResult[];
}
