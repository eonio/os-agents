import { describe, expect, it } from "vitest";
import {
  isAuthorizationError,
  isMissingAuthenticationError,
  isModelUnavailableError,
} from "../src/providers/copilot-provider.js";

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

describe("isModelUnavailableError", () => {
  it("detects unavailable model failures", () => {
    expect(
      isModelUnavailableError(
        new Error('Request session.create failed with message: Model "gpt-4o" is not available.'),
      ),
    ).toBe(true);
  });

  it("ignores unrelated model errors", () => {
    expect(isModelUnavailableError(new Error("network timeout"))).toBe(false);
  });
});

describe("isMissingAuthenticationError", () => {
  it("detects missing auth state failures from the Copilot SDK", () => {
    expect(
      isMissingAuthenticationError(
        new Error("Error: Session was not created with authentication info or custom provider"),
      ),
    ).toBe(true);
  });

  it("ignores unrelated auth failures", () => {
    expect(isMissingAuthenticationError(new Error("Authorization error"))).toBe(false);
  });
});
