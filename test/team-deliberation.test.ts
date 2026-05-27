import { describe, expect, it } from "vitest";
import { TeamDeliberationService } from "../src/services/team-deliberation.js";

describe("TeamDeliberationService", () => {
  it("accepts the merged agreement by round 3 when all developer results are completed", () => {
    const service = new TeamDeliberationService();
    const memberResults = [
      { runId: "1", personaId: "david", name: "David", status: "completed" as const, summary: "Found risky options." },
      { runId: "2", personaId: "mark", name: "Mark", status: "completed" as const, summary: "Structured the UI and patterns." },
      { runId: "3", personaId: "katy", name: "Katy", status: "completed" as const, summary: "Mapped workflows and datasets." },
      { runId: "4", personaId: "mary", name: "Mary", status: "completed" as const, summary: "Reduced repeated tooling steps." },
      { runId: "5", personaId: "george", name: "George", status: "completed" as const, summary: "Covered platform and database concerns." },
    ];

    const roundOne = service.evaluateRoundOne(memberResults);
    const roundThree = service.deliberateMerge(memberResults, 3, roundOne);

    expect(roundOne.strategy).toBe("individual");
    expect(roundThree.strategy).toBe("merge");
    expect(roundThree.accepted).toBe(true);
    expect(roundThree.score).toBeGreaterThanOrEqual(90);
    expect(roundThree.votes).toHaveLength(5);
  });

  it("falls back to the best individual round-1 result when the merge never reaches 90", () => {
    const service = new TeamDeliberationService();
    const memberResults = [
      { runId: "1", personaId: "david", name: "David", status: "completed" as const, summary: "Has something." },
      { runId: "2", personaId: "mark", name: "Mark", status: "failed" as const, summary: "" },
      { runId: "3", personaId: "katy", name: "Katy", status: "failed" as const, summary: "" },
      { runId: "4", personaId: "mary", name: "Mary", status: "failed" as const, summary: "" },
      { runId: "5", personaId: "george", name: "George", status: "failed" as const, summary: "" },
    ];

    const roundOne = service.evaluateRoundOne(memberResults);
    const fallback = service.selectBestIndividualFallback(memberResults, roundOne);

    expect(fallback.strategy).toBe("individual");
    expect(fallback.accepted).toBe(false);
    expect(fallback.selectedPersonaName).toBe("David");
  });
});
