import i18n from "@/i18n";
import type { ApiError } from "@/types/api";

const ORG_ERROR_CODES = {
  MINISTRY_SECONDARY_REQUIRED: "ORG_MINISTRY_SECONDARY_REQUIRED",
  MINISTRY_PRIMARY_REQUIRED: "ORG_MINISTRY_PRIMARY_REQUIRED",
  MINISTRY_INVALID_TARGET_AUDIENCES: "ORG_MINISTRY_INVALID_TARGET_AUDIENCES",
  POSITION_NO_INCUMBENT: "ORG_POSITION_NO_INCUMBENT",
  MINISTRY_OWNER_POSITION_REQUIRED: "ORG_MINISTRY_OWNER_POSITION_REQUIRED",
  MINISTRY_APPROVAL_FORBIDDEN: "ORG_MINISTRY_APPROVAL_FORBIDDEN",
  MINISTRY_NOT_PENDING_APPROVAL: "ORG_MINISTRY_NOT_PENDING_APPROVAL",
} as const;

type OrgErrorCode = (typeof ORG_ERROR_CODES)[keyof typeof ORG_ERROR_CODES];

const ERROR_CODE_TO_I18N_KEY: Record<OrgErrorCode, string> = {
  [ORG_ERROR_CODES.MINISTRY_SECONDARY_REQUIRED]: "startBooking.errors.ministrySecondaryRequired",
  [ORG_ERROR_CODES.MINISTRY_PRIMARY_REQUIRED]: "startBooking.errors.ministryPrimaryRequired",
  [ORG_ERROR_CODES.MINISTRY_INVALID_TARGET_AUDIENCES]: "startBooking.errors.targetAudienceAllAgesExclusive",
  [ORG_ERROR_CODES.POSITION_NO_INCUMBENT]: "startBooking.errors.ownerPositionNoIncumbent",
  [ORG_ERROR_CODES.MINISTRY_OWNER_POSITION_REQUIRED]: "startBooking.errors.ownerPositionRequired",
  [ORG_ERROR_CODES.MINISTRY_APPROVAL_FORBIDDEN]: "myMinistry.approvals.errors.forbidden",
  [ORG_ERROR_CODES.MINISTRY_NOT_PENDING_APPROVAL]: "myMinistry.approvals.errors.notPending",
};

const isApiError = (error: unknown): error is ApiError => {
  return Boolean(error && typeof error === "object" && "code" in error && typeof (error as ApiError).code === "number");
};

export const resolveMinistryApplicationErrorMessage = (
  error: unknown,
  fallbackKey = "startBooking.errors.createMinistry"
): string => {
  if (isApiError(error)) {
    const errorCode = error.details?.error_code;
    if (typeof errorCode === "string" && errorCode in ERROR_CODE_TO_I18N_KEY) {
      return i18n.t(ERROR_CODE_TO_I18N_KEY[errorCode as OrgErrorCode]);
    }
    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return i18n.t(fallbackKey);
};
