import { DEVELOPER_PERSONAS } from "../team/personas.js";
const AGREEMENT_THRESHOLD = 90;
function buildIndividualVote(member) {
    const hasSummary = Boolean(member.summary?.trim());
    const score = member.status === "completed" && hasSummary ? 78 : 45;
    return {
        personaId: member.personaId,
        name: member.name,
        score,
        rationale: hasSummary
            ? `${member.name} produced a usable round-1 proposal with clear value for Hans to consider.`
            : `${member.name} did not produce enough completed material for a strong round-1 showing.`,
    };
}
export class TeamDeliberationService {
    createMemberResults(runs) {
        return DEVELOPER_PERSONAS.map((persona) => {
            const run = runs.find((candidate) => candidate.personaId === persona.id);
            return {
                runId: run?.id ?? `${persona.id}-missing`,
                personaId: persona.id,
                name: persona.name,
                status: run?.status ?? "failed",
                summary: run?.summary,
                changeName: run?.workflow.changeName,
            };
        });
    }
    evaluateRoundOne(memberResults) {
        const votes = memberResults.map(buildIndividualVote);
        const score = votes.length
            ? Math.round(votes.reduce((sum, vote) => sum + vote.score, 0) / votes.length)
            : 0;
        return {
            round: 1,
            score,
            accepted: false,
            summary: this.buildRoundOneSummary(memberResults, votes, score),
            votes,
            strategy: "individual",
        };
    }
    deliberateMerge(memberResults, round, roundOne) {
        const votes = roundOne.votes.map((vote) => ({
            ...vote,
            score: Math.min(vote.score + (round === 2 ? 8 : 14), 100),
            rationale: round === 2
                ? `${vote.name} contributed to the merged council proposal during Round 2.`
                : `${vote.name} accepted the refined merged proposal after Round 3 critique.`,
        }));
        const score = Math.round(votes.reduce((sum, vote) => sum + vote.score, 0) / votes.length);
        return {
            round,
            score,
            accepted: score >= AGREEMENT_THRESHOLD,
            summary: this.buildMergeSummary(memberResults, votes, score, round),
            votes,
            strategy: "merge",
        };
    }
    selectBestIndividualFallback(memberResults, roundOne) {
        const bestVote = [...roundOne.votes].sort((left, right) => right.score - left.score)[0];
        const selected = memberResults.find((member) => member.personaId === bestVote.personaId);
        return {
            round: 3,
            score: bestVote.score,
            accepted: false,
            summary: [
                `Hans discarded the merged council result after 3 rounds because the merged score stayed below ${AGREEMENT_THRESHOLD}/100.`,
                `Hans selected the best-performing individual Round 1 solution from ${bestVote.name} (${bestVote.score}/100).`,
                selected?.summary?.trim() || "No summary was available for the selected developer.",
            ].join("\n"),
            votes: roundOne.votes,
            strategy: "individual",
            selectedPersonaId: bestVote.personaId,
            selectedPersonaName: bestVote.name,
        };
    }
    buildRoundOneSummary(memberResults, votes, score) {
        const contributionLines = memberResults.map((member) => {
            const vote = votes.find((candidate) => candidate.personaId === member.personaId);
            const contribution = member.summary?.trim() || "No usable summary was produced.";
            return `- ${member.name} (${vote?.score ?? 0}/100): ${contribution}`;
        });
        return [
            `Hans completed Round 1 evaluation with an average individual score of ${score}/100.`,
            "Initial individual drafts:",
            ...contributionLines,
            "Hans will now start council fusion and critique in the merge rounds.",
        ].join("\n");
    }
    buildMergeSummary(memberResults, votes, score, round) {
        const contributionLines = memberResults.map((member) => {
            const vote = votes.find((candidate) => candidate.personaId === member.personaId);
            const contribution = member.summary?.trim() || "No usable summary was produced.";
            return `- ${member.name} (${vote?.score ?? 0}/100): ${contribution}`;
        });
        return [
            `Hans completed Round ${round} council fusion with a merged score of ${score}/100.`,
            "Merged contributions under Hans's coordination:",
            ...contributionLines,
            "Hans should use this merged proposal only if it meets the target score; otherwise the best individual Round 1 result wins.",
        ].join("\n");
    }
}
//# sourceMappingURL=team-deliberation.js.map