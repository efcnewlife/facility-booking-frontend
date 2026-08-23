import { describe, expect, it } from "vitest";
import { formatQuotedAmount, parsePaymentBookingId } from "./paymentPage";

describe("parsePaymentBookingId", () => {
  it("accepts a booking UUID", () => {
    expect(parsePaymentBookingId("3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe("3fa85f64-5717-4562-b3fc-2c963f66afa6");
  });

  it("rejects a missing or non-UUID value", () => {
    expect(parsePaymentBookingId(undefined)).toBe(null);
    expect(parsePaymentBookingId("")).toBe(null);
    expect(parsePaymentBookingId("not-a-uuid")).toBe(null);
    expect(parsePaymentBookingId("date=2026-09-01&rooms=room-a")).toBe(null);
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
