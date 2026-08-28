import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n", () => ({
  default: {
    t: (key: string) => key,
  },
}));

import type { ApiError } from "@/types/api";
import { resolveMinistryApplicationErrorMessage } from "./ministryApplicationErrors";

describe("resolveMinistryApplicationErrorMessage", () => {
  it("maps stable org error codes to booking i18n keys", () => {
    const error: ApiError = {
      code: 400,
      message: "At least one secondary ministry member is required",
      details: { error_code: "ORG_MINISTRY_SECONDARY_REQUIRED" },
    };
    expect(resolveMinistryApplicationErrorMessage(error)).toBe("startBooking.errors.ministrySecondaryRequired");
  });

  it("falls back to api message when code is unknown", () => {
    const error: ApiError = {
      code: 400,
      message: "Custom backend message",
      details: { error_code: "ORG_UNKNOWN" },
    };
    expect(resolveMinistryApplicationErrorMessage(error)).toBe("Custom backend message");
  });

  it("uses generic fallback for non-api errors", () => {
    expect(resolveMinistryApplicationErrorMessage(new Error("boom"))).toBe("boom");
    expect(resolveMinistryApplicationErrorMessage(null)).toBe("startBooking.errors.createMinistry");
  });
});
