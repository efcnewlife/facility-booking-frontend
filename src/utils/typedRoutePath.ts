const BOOKING_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const normalizePathname = (pathname: string): string => {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
};

/**
 * The literal prefix segment determines resource kind; UUID format alone never infers it, so
 * callers pass one prefix per kind and reject anything that doesn't match that exact segment.
 */
export const extractTypedRouteId = (pathname: string, prefix: string): string | null => {
  const normalized = normalizePathname(pathname);
  if (!normalized.startsWith(prefix)) {
    return null;
  }
  const id = normalized.slice(prefix.length);
  if (!id || id.includes("/") || !BOOKING_UUID.test(id)) {
    return null;
  }
  return id;
};
