import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n", () => ({
  default: {
    t: (key: string) => key,
  },
}));

import type { ApiError } from "@/types/api";
import { resolveRecurringBookingSeriesErrorMessage } from "./recurringBookingErrors";

describe("resolveRecurringBookingSeriesErrorMessage", () => {
  it("maps stable facility recurring error codes to booking i18n keys", () => {
    const error: ApiError = {
      code: 400,
      message: "Now is outside the recurring booking availability window",
      details: { error_code: "FACILITY_RECURRING_AVAILABILITY_WINDOW" },
    };
    expect(resolveRecurringBookingSeriesErrorMessage(error)).toBe("startBooking.errors.recurringAvailabilityWindow");
  });

  it("maps the minimum-occurrences error code", () => {
    const error: ApiError = {
      code: 400,
      message: "Too few weekly occurrences",
      details: { error_code: "FACILITY_RECURRING_MIN_OCCURRENCES" },
    };
    expect(resolveRecurringBookingSeriesErrorMessage(error)).toBe("startBooking.errors.recurringMinOccurrences");
  });

  it("maps the DST nonexistent-time error code", () => {
    const error: ApiError = {
      code: 400,
      message: "Local time does not exist on that date",
      details: { error_code: "FACILITY_RECURRING_DST_NONEXISTENT" },
    };
    expect(resolveRecurringBookingSeriesErrorMessage(error)).toBe("startBooking.errors.recurringDstNonexistent");
  });

  it("maps the scheduling-conflict error code", () => {
    const error: ApiError = {
      code: 409,
      message: "Room already booked",
      details: { error_code: "FACILITY_BOOKING_SCHEDULING_CONFLICT" },
    };
    expect(resolveRecurringBookingSeriesErrorMessage(error)).toBe("startBooking.errors.recurringSchedulingConflict");
  });

  it("maps the invalid-exclusion error code", () => {
    const error: ApiError = {
      code: 400,
      message: "Excluded dates are not conflicting occurrences",
      details: { error_code: "FACILITY_RECURRING_INVALID_EXCLUSION" },
    };
    expect(resolveRecurringBookingSeriesErrorMessage(error)).toBe("startBooking.errors.recurringInvalidExclusion");
  });

  it("maps the protected-ministry-conflict error code", () => {
    const error: ApiError = {
      code: 409,
      message: "This date conflicts with a protected Ministry booking",
      details: {
        error_code: "FACILITY_RECURRING_MINISTRY_CONFLICT",
        ministry_steward_display_name: "Jane Doe",
        ministry_steward_email: "jane@example.org",
      },
    };
    expect(resolveRecurringBookingSeriesErrorMessage(error)).toBe("startBooking.errors.recurringMinistryConflict");
  });

  it("falls back to the api message when the error code is unknown or absent", () => {
    const error: ApiError = {
      code: 403,
      message: "User is not a ministry owner",
    };
    expect(resolveRecurringBookingSeriesErrorMessage(error)).toBe("User is not a ministry owner");
  });

  it("uses the generic fallback for non-api errors", () => {
    expect(resolveRecurringBookingSeriesErrorMessage(new Error("boom"))).toBe("boom");
    expect(resolveRecurringBookingSeriesErrorMessage(null)).toBe("startBooking.errors.createRecurringBooking");
  });
});
