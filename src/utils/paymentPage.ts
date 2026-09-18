const BOOKING_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EM_DASH = "—";

const ONE_TIME_PREFIX = "/payment/one-time/";
const REPEATED_PREFIX = "/payment/repeated/";

export type PaymentRoute = { kind: "one-time"; bookingId: string } | { kind: "repeated"; seriesId: string };

const normalizePathname = (pathname: string): string => {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
};

const extractId = (normalized: string, prefix: string): string | null => {
  if (!normalized.startsWith(prefix)) {
    return null;
  }
  const id = normalized.slice(prefix.length);
  if (!id || id.includes("/") || !BOOKING_UUID.test(id)) {
    return null;
  }
  return id;
};

/**
 * The path segment (`one-time` vs `repeated`) determines the resource kind; UUID format alone
 * never infers it, so a wrong-kind id is rejected up front instead of hitting the other kind's endpoint.
 */
export const parsePaymentRoute = (pathname: string): PaymentRoute | null => {
  const normalized = normalizePathname(pathname);
  const bookingId = extractId(normalized, ONE_TIME_PREFIX);
  if (bookingId) {
    return { kind: "one-time", bookingId };
  }
  const seriesId = extractId(normalized, REPEATED_PREFIX);
  if (seriesId) {
    return { kind: "repeated", seriesId };
  }
  return null;
};

export const isPaymentPath = (pathname: string): boolean => {
  return parsePaymentRoute(pathname) != null;
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
