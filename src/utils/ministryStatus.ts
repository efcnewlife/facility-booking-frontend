export const MINISTRY_STATUS = {
  PENDING_APPROVAL: "pending_approval",
  REJECTED: "rejected",
  ACTIVE: "active",
} as const;

export type MinistryLifecycleStatus = (typeof MINISTRY_STATUS)[keyof typeof MINISTRY_STATUS] | string;

export type MinistryStatusBadgeColor = "warning" | "error" | "success" | "light";

export const isActiveMinistryStatus = (status: string, isActive = true): boolean => {
  return status === MINISTRY_STATUS.ACTIVE && isActive !== false;
};

export const isRejectedMinistryStatus = (status: string): boolean => {
  return status === MINISTRY_STATUS.REJECTED;
};

export const getMinistryStatusBadgeColor = (status: string): MinistryStatusBadgeColor => {
  switch (status) {
    case MINISTRY_STATUS.PENDING_APPROVAL:
      return "warning";
    case MINISTRY_STATUS.REJECTED:
      return "error";
    case MINISTRY_STATUS.ACTIVE:
      return "success";
    default:
      return "light";
  }
};
