import { describe, expect, it } from "vitest";
import { TeamDeliberationService } from "../src/services/team-deliberation.js";

describe("TeamDeliberationService", () => {
  it("creates concise contribution summaries for council turns", () => {
    const service = new TeamDeliberationService();
    const contribution = service.createContribution(
      {
        id: "solution-design",
        title: "Solution design and building blocks",
        prompt: "Define the architecture.",
        maxRounds: 2,
        roundsCompleted: 0,
      },
      "mark",
      "Mark",
      1,
      "Use clear service boundaries. Keep the UI and orchestration contracts explicit.",
    );

    expect(contribution.itemId).toBe("solution-design");
    expect(contribution.round).toBe(1);
    expect(contribution.summary).toContain("Use clear service boundaries.");
  });

  it("rolls up persona participation from council contributions", () => {
    const service = new TeamDeliberationService();
    const memberResults = service.createMemberResults([
      {
        personaId: "mark",
        name: "Mark",
        itemId: "goals-scope",
        itemTitle: "Goals, stakeholders, and scope",
        round: 1,
        summary: "Clarified scope.",
        content: "Clarified scope.",
      },
      {
        personaId: "mark",
        name: "Mark",
        itemId: "solution-design",
        itemTitle: "Solution design and building blocks",
        round: 2,
        summary: "Tightened architecture.",
        content: "Tightened architecture.",
      },
    ]);

    const mark = memberResults.find((member) => member.personaId === "mark");
    const david = memberResults.find((member) => member.personaId === "david");

    expect(mark?.contributionCount).toBe(2);
    expect(mark?.summary).toBe("Tightened architecture.");
    expect(david?.contributionCount).toBe(0);
  });
});
