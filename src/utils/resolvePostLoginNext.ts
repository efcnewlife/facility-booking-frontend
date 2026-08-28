const BOOKING_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MINISTRY_APPROVAL_PREFIX = "/my-ministry/approvals/";
const HOME_PATH = "/";

const normalizePathname = (pathname: string): string => {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
};

const splitPathAndSearch = (value: string): { pathname: string; search: string } => {
  const queryIndex = value.indexOf("?");
  if (queryIndex === -1) {
    return { pathname: value, search: "" };
  }

  return {
    pathname: value.slice(0, queryIndex),
    search: value.slice(queryIndex),
  };
};

const decodeNextParam = (next: string): string | null => {
  try {
    return decodeURIComponent(next);
  } catch {
    return null;
  }
};

const isSafeRelativePath = (value: string): boolean => {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return false;
  }

  if (value.includes("://") || value.includes("\\")) {
    return false;
  }

  return true;
};

export const isAllowlistedPostLoginPath = (pathname: string): boolean => {
  const path = normalizePathname(pathname);
  if (!path.startsWith(MINISTRY_APPROVAL_PREFIX)) {
    return false;
  }

  const ministryId = path.slice(MINISTRY_APPROVAL_PREFIX.length);
  if (!ministryId || ministryId.includes("/")) {
    return false;
  }

  return BOOKING_UUID.test(ministryId);
};

export const resolvePostLoginNext = (next: string | null | undefined): string => {
  if (!next) {
    return HOME_PATH;
  }

  const decoded = decodeNextParam(next);
  if (!decoded || !isSafeRelativePath(decoded)) {
    return HOME_PATH;
  }

  const { pathname, search } = splitPathAndSearch(decoded);
  const normalizedPathname = normalizePathname(pathname);
  if (!isAllowlistedPostLoginPath(normalizedPathname)) {
    return HOME_PATH;
  }

  return `${normalizedPathname}${search}`;
};

export const buildLoginPathWithNext = (returnPath: string): string => {
  return `/login?next=${encodeURIComponent(returnPath)}`;
};
