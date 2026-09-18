const BOOKING_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ONE_TIME_PREFIX = "/booking-details/one-time/";

const normalizePathname = (pathname: string): string => {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
};

export const parseOneTimeBookingDetailsDraftId = (pathname: string): string | null => {
  const normalized = normalizePathname(pathname);
  if (!normalized.startsWith(ONE_TIME_PREFIX)) {
    return null;
  }
  const draftId = normalized.slice(ONE_TIME_PREFIX.length);
  if (!draftId || draftId.includes("/") || !BOOKING_UUID.test(draftId)) {
    return null;
  }
  return draftId;
};

export const isOneTimeBookingDetailsPath = (pathname: string): boolean => {
  return parseOneTimeBookingDetailsDraftId(pathname) != null;
};
