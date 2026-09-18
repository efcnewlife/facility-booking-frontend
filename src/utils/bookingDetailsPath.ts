import { extractTypedRouteId } from "./typedRoutePath";

const ONE_TIME_PREFIX = "/booking-details/one-time/";

export const parseOneTimeBookingDetailsDraftId = (pathname: string): string | null => {
  return extractTypedRouteId(pathname, ONE_TIME_PREFIX);
};

export const isOneTimeBookingDetailsPath = (pathname: string): boolean => {
  return parseOneTimeBookingDetailsDraftId(pathname) != null;
};
