import i18n from "@/i18n";
import type { ApiError } from "@/types/api";

const FACILITY_RECURRING_ERROR_CODES = {
  NOT_ELIGIBLE: "FACILITY_RECURRING_NOT_ELIGIBLE",
  ROOMS_REQUIRED: "FACILITY_BOOKING_ROOMS_REQUIRED",
  INVALID_TIME_RANGE: "FACILITY_RECURRING_INVALID_TIME_RANGE",
  MAX_ROOMS: "FACILITY_BOOKING_MAX_ROOMS",
  WEEKDAY_MISMATCH: "FACILITY_RECURRING_WEEKDAY_MISMATCH",
  USE_PERIOD: "FACILITY_RECURRING_USE_PERIOD",
  AVAILABILITY_WINDOW: "FACILITY_RECURRING_AVAILABILITY_WINDOW",
  MIN_OCCURRENCES: "FACILITY_RECURRING_MIN_OCCURRENCES",
  DST_NONEXISTENT: "FACILITY_RECURRING_DST_NONEXISTENT",
  DUPLICATE_LINE: "FACILITY_BOOKING_DUPLICATE_LINE",
  MINISTRY_INACTIVE: "FACILITY_BOOKING_MINISTRY_INACTIVE",
  WEEKLY_QUOTA: "FACILITY_RECURRING_WEEKLY_QUOTA",
  SCHEDULING_CONFLICT: "FACILITY_BOOKING_SCHEDULING_CONFLICT",
  ROOM_BLACKOUT: "FACILITY_BOOKING_ROOM_BLACKOUT",
} as const;

type FacilityRecurringErrorCode = (typeof FACILITY_RECURRING_ERROR_CODES)[keyof typeof FACILITY_RECURRING_ERROR_CODES];

const ERROR_CODE_TO_I18N_KEY: Record<FacilityRecurringErrorCode, string> = {
  [FACILITY_RECURRING_ERROR_CODES.NOT_ELIGIBLE]: "startBooking.errors.recurringNotEligible",
  [FACILITY_RECURRING_ERROR_CODES.ROOMS_REQUIRED]: "startBooking.errors.recurringRoomsRequired",
  [FACILITY_RECURRING_ERROR_CODES.INVALID_TIME_RANGE]: "startBooking.errors.recurringInvalidTimeRange",
  [FACILITY_RECURRING_ERROR_CODES.MAX_ROOMS]: "startBooking.errors.recurringMaxRooms",
  [FACILITY_RECURRING_ERROR_CODES.WEEKDAY_MISMATCH]: "startBooking.errors.recurringWeekdayMismatch",
  [FACILITY_RECURRING_ERROR_CODES.USE_PERIOD]: "startBooking.errors.recurringUsePeriod",
  [FACILITY_RECURRING_ERROR_CODES.AVAILABILITY_WINDOW]: "startBooking.errors.recurringAvailabilityWindow",
  [FACILITY_RECURRING_ERROR_CODES.MIN_OCCURRENCES]: "startBooking.errors.recurringMinOccurrences",
  [FACILITY_RECURRING_ERROR_CODES.DST_NONEXISTENT]: "startBooking.errors.recurringDstNonexistent",
  [FACILITY_RECURRING_ERROR_CODES.DUPLICATE_LINE]: "startBooking.errors.recurringDuplicateRoom",
  [FACILITY_RECURRING_ERROR_CODES.MINISTRY_INACTIVE]: "startBooking.errors.recurringMinistryInactive",
  [FACILITY_RECURRING_ERROR_CODES.WEEKLY_QUOTA]: "startBooking.errors.recurringWeeklyQuota",
  [FACILITY_RECURRING_ERROR_CODES.SCHEDULING_CONFLICT]: "startBooking.errors.recurringSchedulingConflict",
  [FACILITY_RECURRING_ERROR_CODES.ROOM_BLACKOUT]: "startBooking.errors.recurringRoomBlackout",
};

const isApiError = (error: unknown): error is ApiError => {
  return Boolean(error && typeof error === "object" && "code" in error && typeof (error as ApiError).code === "number");
};

export const resolveRecurringBookingSeriesErrorMessage = (
  error: unknown,
  fallbackKey = "startBooking.errors.createRecurringBooking"
): string => {
  if (isApiError(error)) {
    const errorCode = error.details?.error_code;
    if (typeof errorCode === "string" && errorCode in ERROR_CODE_TO_I18N_KEY) {
      return i18n.t(ERROR_CODE_TO_I18N_KEY[errorCode as FacilityRecurringErrorCode]);
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
