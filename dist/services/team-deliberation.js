import { DEVELOPER_PERSONAS } from "../team/personas.js";
function summarizeContribution(content) {
    const normalized = content.replace(/\s+/g, " ").trim();
    if (!normalized) {
        return "No usable contribution.";
    }
    const sentence = normalized.split(/(?<=[.!?])\s+/)[0] ?? normalized;
    return sentence.slice(0, 180);
}
export class TeamDeliberationService {
    buildDiscussionSnapshot(item, contributions) {
        const lines = contributions.map((contribution) => `- ${contribution.name} (round ${contribution.round}): ${contribution.summary}`);
        return [
            `Agenda item: ${item.title}.`,
            `Prompt: ${item.prompt}`,
            "Council notes:",
            ...lines,
        ].join("\n");
    }
    createContribution(item, personaId, name, round, content) {
        return {
            personaId,
            name,
            itemId: item.id,
            itemTitle: item.title,
            round,
            content: content.trim(),
            summary: summarizeContribution(content),
        };
    }
    createDecision(item, roundsUsed, summary, followUpPrompt) {
        return {
            itemId: item.id,
            itemTitle: item.title,
            roundsUsed,
            summary: summary.trim(),
            followUpPrompt: followUpPrompt?.trim() || undefined,
        };
    }
    createMemberResults(contributions) {
        return DEVELOPER_PERSONAS.map((persona) => {
            const memberContributions = contributions.filter((contribution) => contribution.personaId === persona.id);
            return {
                personaId: persona.id,
                name: persona.name,
                contributionCount: memberContributions.length,
                summary: memberContributions.at(-1)?.summary,
            };
        });
    }
}
//# sourceMappingURL=team-deliberation.js.map