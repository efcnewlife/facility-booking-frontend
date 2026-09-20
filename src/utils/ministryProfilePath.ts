import { extractTypedRouteId } from "./typedRoutePath";

const MINISTRY_PROFILE_PREFIX = "/my-ministry/";

export const ministryProfilePath = (ministryId: string): string => `${MINISTRY_PROFILE_PREFIX}${ministryId}`;

export const parseMinistryProfileId = (pathname: string): string | null => {
  return extractTypedRouteId(pathname, MINISTRY_PROFILE_PREFIX);
};

export const isMinistryProfilePath = (pathname: string): boolean => {
  return parseMinistryProfileId(pathname) != null;
};
