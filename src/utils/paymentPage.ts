const BOOKING_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EM_DASH = "—";

export const parsePaymentBookingId = (value: string | undefined): string | null => {
  if (!value || !BOOKING_UUID.test(value)) {
    return null;
  }
  return value;
};

export const formatQuotedAmount = (
  quotedAmount: string | number | null | undefined,
  currency: string | null | undefined,
  locale: string
): string => {
  if (quotedAmount == null || quotedAmount === "") {
    return EM_DASH;
  }
  const amount = typeof quotedAmount === "number" ? quotedAmount : Number(quotedAmount);
  if (!Number.isFinite(amount)) {
    return EM_DASH;
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency || "CAD",
  }).format(amount);
};

export const isPaymentPath = (pathname: string): boolean => {
  const parts = pathname.split("/").filter(Boolean);
  return parts.length === 2 && parts[0] === "payment" && parsePaymentBookingId(parts[1]) != null;
};
