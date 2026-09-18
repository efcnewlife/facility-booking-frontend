import { describe, expect, it } from "vitest";
import {
  cancellationReasonFieldFeedback,
  normalizeCancellationReason,
  validateCancellationReason,
} from "./cancellationReason";

describe("validateCancellationReason", () => {
  it("requires a non-empty reason", () => {
    expect(validateCancellationReason("")).toBe("required");
    expect(validateCancellationReason("   ")).toBe("required");
  });

  it("rejects a reason over 250 characters", () => {
    expect(validateCancellationReason("a".repeat(251))).toBe("tooLong");
  });

  it("accepts a 1-250 character reason", () => {
    expect(validateCancellationReason("a")).toBe(null);
    expect(validateCancellationReason("a".repeat(250))).toBe(null);
    expect(validateCancellationReason("  Room no longer needed  ")).toBe(null);
  });
});

describe("normalizeCancellationReason", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeCancellationReason("  Plans changed  ")).toBe("Plans changed");
  });
});

describe("cancellationReasonFieldFeedback", () => {
  const translate = (key: string) => key;

  it("shows no error before the field is touched", () => {
    expect(cancellationReasonFieldFeedback("", false, translate)).toEqual({ error: undefined });
  });

  it("shows the localized error once touched", () => {
    expect(cancellationReasonFieldFeedback("", true, translate)).toEqual({
      error: "cancellationReason.errors.required",
    });
    expect(cancellationReasonFieldFeedback("a".repeat(251), true, translate)).toEqual({
      error: "cancellationReason.errors.tooLong",
    });
  });

  it("shows no error once touched with a valid reason", () => {
    expect(cancellationReasonFieldFeedback("Plans changed", true, translate)).toEqual({ error: undefined });
  });
});
