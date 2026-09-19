import { describe, expect, it } from "vitest";
import { discountLabelKey } from "./discountEligibility";

describe("discountLabelKey", () => {
  it("labels the Ministry Discount code", () => {
    expect(discountLabelKey("mission_aligned")).toBe("bookingDetails.ministryDiscount");
  });

  it("labels the Recurring Discount code", () => {
    expect(discountLabelKey("recurring_weekly_monthly")).toBe("bookingDetails.recurringDiscount");
  });

  it("falls back to a generic Discount label when the server reports no discount code", () => {
    expect(discountLabelKey(null)).toBe("bookingDetails.discount");
  });
});
