const BOOKING_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MINISTRY_APPROVAL_PREFIX = "/my-ministry/approvals/";

export const MY_MINISTRY_APPROVALS_TAB_QUERY = "tab=approvals";

export const myMinistryApprovalsTabPath = (): string => `/my-ministry?${MY_MINISTRY_APPROVALS_TAB_QUERY}`;

export const ministryApprovalDetailPath = (ministryId: string): string => `${MINISTRY_APPROVAL_PREFIX}${ministryId}`;

export const parseMinistryApprovalDetailId = (pathname: string): string | null => {
  const normalized = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  if (!normalized.startsWith(MINISTRY_APPROVAL_PREFIX)) {
    return null;
  }

  const ministryId = normalized.slice(MINISTRY_APPROVAL_PREFIX.length);
  if (!ministryId || ministryId.includes("/")) {
    return null;
  }

  return BOOKING_UUID.test(ministryId) ? ministryId : null;
};

export const isMinistryApprovalDetailPath = (pathname: string): boolean => {
  return parseMinistryApprovalDetailId(pathname) != null;
};
