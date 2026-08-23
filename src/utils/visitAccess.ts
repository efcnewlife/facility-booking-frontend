import { isPaymentPath } from "./paymentPage";

export type VisitAccess = "login" | "not-found" | "allow";

const LOGIN_PATH = "/login";
export const MY_MINISTRY_PATH = "/my-ministry";
export const SUPPORT_PATH = "/contact";

const KNOWN_MEMBER_PATHS = new Set([
  "/",
  "/start-booking",
  "/rooms",
  "/booking-details",
  "/my-bookings",
  "/my-profile",
  SUPPORT_PATH,
  MY_MINISTRY_PATH,
]);

interface VisitAccessInput {
  isAuthenticated: boolean;
  isMinistryMember: boolean;
  pathname: string;
}

const normalizePathname = (pathname: string): string => {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
};

export const visitAccess = ({ isAuthenticated, isMinistryMember, pathname }: VisitAccessInput): VisitAccess => {
  const path = normalizePathname(pathname);

  if (!isAuthenticated) {
    return path === LOGIN_PATH ? "allow" : "login";
  }

  if (path === LOGIN_PATH) {
    return "allow";
  }

  if (!KNOWN_MEMBER_PATHS.has(path) && !isPaymentPath(path)) {
    return "not-found";
  }

  if (path === MY_MINISTRY_PATH && !isMinistryMember) {
    return "not-found";
  }

  return "allow";
};

export const isMinistryMemberFromList = (items: readonly unknown[]): boolean => {
  return items.length > 0;
};
