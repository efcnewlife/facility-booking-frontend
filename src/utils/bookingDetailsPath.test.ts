import { describe, expect, it } from "vitest";
import {
  isBookingDetailsPath,
  isOneTimeBookingDetailsPath,
  isRepeatedBookingDetailsPath,
  oneTimeBookingDetailsPath,
  parseBookingDetailsRoute,
  parseOneTimeBookingDetailsDraftId,
  parseRepeatedBookingDetailsDraftId,
  repeatedBookingDetailsPath,
} from "./bookingDetailsPath";

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

describe("parseRepeatedBookingDetailsDraftId", () => {
  it("reads a Recurring Series Draft id from the typed repeated route", () => {
    expect(parseRepeatedBookingDetailsDraftId("/booking-details/repeated/3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe(
      "3fa85f64-5717-4562-b3fc-2c963f66afa6"
    );
  });

  it("rejects a missing, malformed, or trailing-segment path", () => {
    expect(parseRepeatedBookingDetailsDraftId("/booking-details/repeated/not-a-uuid")).toBe(null);
    expect(parseRepeatedBookingDetailsDraftId("/booking-details/repeated/")).toBe(null);
    expect(
      parseRepeatedBookingDetailsDraftId("/booking-details/repeated/3fa85f64-5717-4562-b3fc-2c963f66afa6/extra")
    ).toBe(null);
  });

  it("does not treat a One-time Draft id as a Recurring Series Draft", () => {
    expect(parseRepeatedBookingDetailsDraftId("/booking-details/one-time/3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe(
      null
    );
  });
});

describe("parseBookingDetailsRoute", () => {
  it("uses the path segment to choose the Draft kind, not UUID format", () => {
    expect(parseBookingDetailsRoute("/booking-details/one-time/3fa85f64-5717-4562-b3fc-2c963f66afa6")).toEqual({
      kind: "one-time",
      draftId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    });
    expect(parseBookingDetailsRoute("/booking-details/repeated/3fa85f64-5717-4562-b3fc-2c963f66afa6")).toEqual({
      kind: "repeated",
      draftId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    });
    expect(parseBookingDetailsRoute("/booking-details/3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe(null);
  });
});

describe("isBookingDetailsPath", () => {
  it("is true for either valid typed Booking Details kind", () => {
    expect(isBookingDetailsPath("/booking-details/one-time/3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe(true);
    expect(isRepeatedBookingDetailsPath("/booking-details/repeated/3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe(true);
    expect(isBookingDetailsPath("/booking-details/repeated/3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe(true);
    expect(isBookingDetailsPath("/booking-details")).toBe(false);
  });
});

describe("repeatedBookingDetailsPath", () => {
  it("builds the typed Repeated Booking Details route", () => {
    expect(repeatedBookingDetailsPath("3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe(
      "/booking-details/repeated/3fa85f64-5717-4562-b3fc-2c963f66afa6"
    );
  });
});

describe("oneTimeBookingDetailsPath", () => {
  it("builds the typed One-time Booking Details route", () => {
    expect(oneTimeBookingDetailsPath("3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe(
      "/booking-details/one-time/3fa85f64-5717-4562-b3fc-2c963f66afa6"
    );
  });
});
