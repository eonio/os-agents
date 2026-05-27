import { describe, expect, it } from "vitest";
import { assertTransition, canTransition } from "../src/domain/workflow.js";

describe("workflow transitions", () => {
  it("allows ordered transitions", () => {
    expect(canTransition("queued", "preparing-workspace")).toBe(true);
    expect(canTransition("implementing", "handoff")).toBe(true);
  });

  it("rejects skipping phases", () => {
    expect(canTransition("queued", "implementing")).toBe(false);
    expect(() => assertTransition("queued", "implementing")).toThrow(
      /Invalid workflow transition/,
    );
  });
});
