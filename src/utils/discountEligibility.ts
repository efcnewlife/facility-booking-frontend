export type DiscountEligibilityBookingType = "one_time" | "recurring";

export const MINISTRY_DISCOUNT_CODE = "mission_aligned";
export const RECURRING_DISCOUNT_CODE = "recurring_weekly_monthly";

/** Maps the server's effective discount_code to the Payment Summary row label. */
export const discountLabelKey = (discountCode: string | null): string => {
  if (discountCode === MINISTRY_DISCOUNT_CODE) {
    return "bookingDetails.ministryDiscount";
  }
  if (discountCode === RECURRING_DISCOUNT_CODE) {
    return "bookingDetails.recurringDiscount";
  }
  return "bookingDetails.discount";
};
