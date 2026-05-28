import type {
  CouncilContribution,
  CouncilDecision,
  PrdDiscussionItem,
  TeamMemberResult,
} from "../domain/types.js";
import { DEVELOPER_PERSONAS } from "../team/personas.js";

function summarizeContribution(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "No usable contribution.";
  }

  const sentence = normalized.split(/(?<=[.!?])\s+/)[0] ?? normalized;
  return sentence.slice(0, 180);
}

export class TeamDeliberationService {
  public buildDiscussionSnapshot(
    item: PrdDiscussionItem,
    contributions: CouncilContribution[],
  ): string {
    const lines = contributions.map(
      (contribution) =>
        `- ${contribution.name} (round ${contribution.round}): ${contribution.summary}`,
    );

    return [
      `Agenda item: ${item.title}.`,
      `Prompt: ${item.prompt}`,
      "Council notes:",
      ...lines,
    ].join("\n");
  }

  public createContribution(
    item: PrdDiscussionItem,
    personaId: string,
    name: string,
    round: 1 | 2,
    content: string,
  ): CouncilContribution {
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

  public createDecision(
    item: PrdDiscussionItem,
    roundsUsed: 1 | 2,
    summary: string,
    followUpPrompt?: string,
  ): CouncilDecision {
    return {
      itemId: item.id,
      itemTitle: item.title,
      roundsUsed,
      summary: summary.trim(),
      followUpPrompt: followUpPrompt?.trim() || undefined,
    };
  }

  public createMemberResults(contributions: CouncilContribution[]): TeamMemberResult[] {
    return DEVELOPER_PERSONAS.map((persona) => {
      const memberContributions = contributions.filter(
        (contribution) => contribution.personaId === persona.id,
      );

      return {
        personaId: persona.id,
        name: persona.name,
        contributionCount: memberContributions.length,
        summary: memberContributions.at(-1)?.summary,
      };
    });
  }
}
