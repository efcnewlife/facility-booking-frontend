import { extractTypedRouteId } from "./typedRoutePath";

const EM_DASH = "—";

const ONE_TIME_PREFIX = "/payment/one-time/";
const REPEATED_PREFIX = "/payment/repeated/";

export type PaymentRoute = { kind: "one-time"; bookingId: string } | { kind: "repeated"; seriesId: string };

/**
 * The path segment (`one-time` vs `repeated`) determines the resource kind; UUID format alone
 * never infers it, so a wrong-kind id is rejected up front instead of hitting the other kind's endpoint.
 */
export const parsePaymentRoute = (pathname: string): PaymentRoute | null => {
  const bookingId = extractTypedRouteId(pathname, ONE_TIME_PREFIX);
  if (bookingId) {
    return { kind: "one-time", bookingId };
  }
  const seriesId = extractTypedRouteId(pathname, REPEATED_PREFIX);
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
