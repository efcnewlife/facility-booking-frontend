import { describe, expect, it } from "vitest";
import { mapPaymentSummary } from "./paymentSummary";

const EM_DASH = "—";

describe("mapPaymentSummary", () => {
  it("uses em dashes when the Preview quote is missing", () => {
    expect(mapPaymentSummary(null, "en-CA")).toEqual({
      rate: EM_DASH,
      ministryDiscount: EM_DASH,
      surcharge: EM_DASH,
      subtotal: EM_DASH,
      tax: EM_DASH,
      total: EM_DASH,
    });
  });

  it("maps Preview quote money fields and leaves tax as an em dash", () => {
    expect(
      mapPaymentSummary(
        {
          subtotalAmount: "150.00",
          discountAmount: "22.50",
          surchargeAmount: "5.00",
          quotedAmount: "132.50",
          currency: "CAD",
        },
        "en-CA"
      )
    ).toEqual({
      rate: "$150.00",
      ministryDiscount: "-$22.50",
      surcharge: "$5.00",
      subtotal: EM_DASH,
      tax: EM_DASH,
      total: "$132.50",
    });
  });

  it("does not invent HST from quoted amount", () => {
    const summary = mapPaymentSummary(
      {
        subtotalAmount: "100.00",
        discountAmount: "0",
        surchargeAmount: "0",
        quotedAmount: "100.00",
        currency: "CAD",
      },
      "en-CA"
    );
    expect(summary.tax).toBe(EM_DASH);
    expect(summary.total).toBe("$100.00");
    expect(summary.ministryDiscount).toBe("$0.00");
  });

  it("uses em dashes for missing quote fields", () => {
    expect(
      mapPaymentSummary(
        {
          currency: "CAD",
        },
        "en-CA"
      )
    ).toEqual({
      rate: EM_DASH,
      ministryDiscount: EM_DASH,
      surcharge: EM_DASH,
      subtotal: EM_DASH,
      tax: EM_DASH,
      total: EM_DASH,
    });
  });
});
