import type { RunRecord, TeamAgreement, TeamMemberResult } from "../domain/types.js";
export declare class TeamDeliberationService {
    createMemberResults(runs: RunRecord[]): TeamMemberResult[];
    evaluateRoundOne(memberResults: TeamMemberResult[]): TeamAgreement;
    deliberateMerge(memberResults: TeamMemberResult[], round: 2 | 3, roundOne: TeamAgreement): TeamAgreement;
    selectBestIndividualFallback(memberResults: TeamMemberResult[], roundOne: TeamAgreement): TeamAgreement;
    private buildRoundOneSummary;
    private buildMergeSummary;
}
