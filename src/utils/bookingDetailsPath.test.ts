import { describe, expect, it } from "vitest";
import { isOneTimeBookingDetailsPath, parseOneTimeBookingDetailsDraftId } from "./bookingDetailsPath";

describe("parseOneTimeBookingDetailsDraftId", () => {
  it("reads a Booking Draft id from the typed one-time route", () => {
    expect(parseOneTimeBookingDetailsDraftId("/booking-details/one-time/3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe(
      "3fa85f64-5717-4562-b3fc-2c963f66afa6"
    );
  });

  it("rejects a missing, malformed, or trailing-segment path", () => {
    expect(parseOneTimeBookingDetailsDraftId("/booking-details/one-time/not-a-uuid")).toBe(null);
    expect(parseOneTimeBookingDetailsDraftId("/booking-details/one-time/")).toBe(null);
    expect(
      parseOneTimeBookingDetailsDraftId("/booking-details/one-time/3fa85f64-5717-4562-b3fc-2c963f66afa6/extra")
    ).toBe(null);
  });

  it("rejects the untyped legacy path and an unknown kind", () => {
    expect(parseOneTimeBookingDetailsDraftId("/booking-details")).toBe(null);
    expect(parseOneTimeBookingDetailsDraftId("/booking-details/repeated/3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe(
      null
    );
  });
});

describe("isOneTimeBookingDetailsPath", () => {
  it("is true only for a valid typed one-time Booking Details path", () => {
    expect(isOneTimeBookingDetailsPath("/booking-details/one-time/3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe(true);
    expect(isOneTimeBookingDetailsPath("/booking-details/one-time/not-a-uuid")).toBe(false);
  });
});
