import { describe, expect, it } from "vitest";
import { formatQuotedAmount, isPaymentPath, parsePaymentRoute } from "./paymentPage";

describe("parsePaymentRoute", () => {
  it("reads a One-time booking id from the typed one-time route", () => {
    expect(parsePaymentRoute("/payment/one-time/3fa85f64-5717-4562-b3fc-2c963f66afa6")).toEqual({
      kind: "one-time",
      bookingId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    });
  });

  it("reads a Recurring Booking Series id from the typed repeated route", () => {
    expect(parsePaymentRoute("/payment/repeated/3fa85f64-5717-4562-b3fc-2c963f66afa6")).toEqual({
      kind: "repeated",
      seriesId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    });
  });

  it("rejects a missing or malformed id under either typed route", () => {
    expect(parsePaymentRoute("/payment/one-time/not-a-uuid")).toBe(null);
    expect(parsePaymentRoute("/payment/repeated/not-a-uuid")).toBe(null);
    expect(parsePaymentRoute("/payment/one-time/")).toBe(null);
    expect(parsePaymentRoute("/payment/repeated/")).toBe(null);
  });

  it("rejects an untyped or unknown payment path", () => {
    expect(parsePaymentRoute("/payment/3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe(null);
    expect(parsePaymentRoute("/payment")).toBe(null);
    expect(parsePaymentRoute("/payment/one-time/3fa85f64-5717-4562-b3fc-2c963f66afa6/extra")).toBe(null);
  });
});

describe("isPaymentPath", () => {
  it("is true only for a valid typed payment path", () => {
    expect(isPaymentPath("/payment/one-time/3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe(true);
    expect(isPaymentPath("/payment/repeated/3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe(true);
    expect(isPaymentPath("/payment/one-time/not-a-uuid")).toBe(false);
  });
});

describe("formatQuotedAmount", () => {
  it("shows an em dash when the GET has no quoted amount", () => {
    expect(formatQuotedAmount(null, "CAD", "en")).toBe("—");
    expect(formatQuotedAmount(undefined, "CAD", "en")).toBe("—");
    expect(formatQuotedAmount("", "CAD", "en")).toBe("—");
  });

  it("formats the booker GET quoted amount", () => {
    expect(formatQuotedAmount("85.00", "CAD", "en-CA")).toBe("$85.00");
    expect(formatQuotedAmount(85, "CAD", "en-CA")).toBe("$85.00");
  });
});
