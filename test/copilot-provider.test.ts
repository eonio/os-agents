import { describe, expect, it } from "vitest";
import { isAuthorizationError } from "../src/providers/copilot-provider.js";

describe("isAuthorizationError", () => {
  it("detects Copilot SDK authorization failures", () => {
    expect(isAuthorizationError(new Error("Authorization error, you may need to run /login"))).toBe(
      true,
    );
    expect(isAuthorizationError(new Error("something about /login went wrong"))).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isAuthorizationError(new Error("network timeout"))).toBe(false);
  });
});
