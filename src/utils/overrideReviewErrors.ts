import type { ApiError } from "@/types/api";

const REVIEW_ERROR_CODES = ["FACILITY_BOOKING_OVERRIDE_REVIEW_REQUIRED", "FACILITY_BOOKING_OVERRIDE_REVIEW_STALE"];
const SCHEDULING_CONFLICT = "FACILITY_BOOKING_SCHEDULING_CONFLICT";

export type FinalConfirmationRejection = "review" | "conflict";

const isApiError = (error: unknown): error is ApiError => {
  return Boolean(error && typeof error === "object" && "code" in error && typeof (error as ApiError).code === "number");
};

/**
 * Final confirmation errors that require a refreshed Draft evaluation: a missing or stale Override review,
 * or occupancy that now blocks the proposal. Neither may be retried silently.
 */
export const finalConfirmationRejection = (error: unknown): FinalConfirmationRejection | null => {
  if (!isApiError(error)) {
    return null;
  }
  const errorCode = error.details?.error_code;
  if (typeof errorCode !== "string") {
    return null;
  }
  if (REVIEW_ERROR_CODES.includes(errorCode)) {
    return "review";
  }
  return errorCode === SCHEDULING_CONFLICT ? "conflict" : null;
};
