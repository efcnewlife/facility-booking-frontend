import { extractTypedRouteId } from "./typedRoutePath";

const ONE_TIME_PREFIX = "/booking-details/one-time/";
const REPEATED_PREFIX = "/booking-details/repeated/";

export type BookingDetailsRoute = { kind: "one-time"; draftId: string } | { kind: "repeated"; draftId: string };

export const parseOneTimeBookingDetailsDraftId = (pathname: string): string | null => {
  return extractTypedRouteId(pathname, ONE_TIME_PREFIX);
};

export const parseRepeatedBookingDetailsDraftId = (pathname: string): string | null => {
  return extractTypedRouteId(pathname, REPEATED_PREFIX);
};

export const parseBookingDetailsRoute = (pathname: string): BookingDetailsRoute | null => {
  const oneTimeId = parseOneTimeBookingDetailsDraftId(pathname);
  if (oneTimeId) {
    return { kind: "one-time", draftId: oneTimeId };
  }
  const repeatedId = parseRepeatedBookingDetailsDraftId(pathname);
  if (repeatedId) {
    return { kind: "repeated", draftId: repeatedId };
  }
  return null;
};

export const isOneTimeBookingDetailsPath = (pathname: string): boolean => {
  return parseOneTimeBookingDetailsDraftId(pathname) != null;
};

export const isRepeatedBookingDetailsPath = (pathname: string): boolean => {
  return parseRepeatedBookingDetailsDraftId(pathname) != null;
};

export const isBookingDetailsPath = (pathname: string): boolean => {
  return parseBookingDetailsRoute(pathname) != null;
};

export const repeatedBookingDetailsPath = (draftId: string): string => {
  return `${REPEATED_PREFIX}${draftId}`;
};
