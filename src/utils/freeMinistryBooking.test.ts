import { describe, expect, it } from "vitest";
import {
  bookingConfirmationTarget,
  isFreeMinistryConfirmationState,
  isSavedFreeMinistryBooking,
} from "./freeMinistryBooking";

describe("bookingConfirmationTarget", () => {
  it("keeps Personal confirmation on the payment pages with no confirmation state", () => {
    expect(bookingConfirmationTarget("one-time", "b-1", false)).toEqual({
      path: "/payment/one-time/b-1",
      state: undefined,
    });
    expect(bookingConfirmationTarget("repeated", "s-1", false)).toEqual({
      path: "/payment/repeated/s-1",
      state: undefined,
    });
  });

  it("sends free Ministry confirmation to the saved details with the confirmation state", () => {
    expect(bookingConfirmationTarget("one-time", "b-1", true)).toEqual({
      path: "/my-bookings/b-1",
      state: { freeMinistryConfirmed: true },
    });
    expect(bookingConfirmationTarget("repeated", "s-1", true)).toEqual({
      path: "/my-bookings/series/s-1",
      state: { freeMinistryConfirmed: true },
    });
  });
});

describe("isSavedFreeMinistryBooking", () => {
  it("is true only for a Ministry record with a zero total", () => {
    expect(isSavedFreeMinistryBooking({ ministryId: "m", quotedAmount: "0.00" })).toBe(true);
    expect(isSavedFreeMinistryBooking({ ministryId: "m", quotedAmount: 0 })).toBe(true);
  });

  it("is false for Personal records, priced records, and a missing total", () => {
    expect(isSavedFreeMinistryBooking({ ministryId: null, quotedAmount: "0.00" })).toBe(false);
    expect(isSavedFreeMinistryBooking({ ministryId: "m", quotedAmount: "70.00" })).toBe(false);
    expect(isSavedFreeMinistryBooking({ ministryId: "m", quotedAmount: null })).toBe(false);
    expect(isSavedFreeMinistryBooking({ ministryId: "m", quotedAmount: "" })).toBe(false);
  });
});

describe("isFreeMinistryConfirmationState", () => {
  it("recognizes only the free confirmation navigation state", () => {
    expect(isFreeMinistryConfirmationState({ freeMinistryConfirmed: true })).toBe(true);
    expect(isFreeMinistryConfirmationState(null)).toBe(false);
    expect(isFreeMinistryConfirmationState({ draftId: "d-1" })).toBe(false);
  });
});
