export const BOOKING_TITLE_MIN_LENGTH = 1;
export const BOOKING_TITLE_MAX_LENGTH = 30;

export type BookingTitleError = "required" | "tooLong" | "invalidCharacters";

const HTML_TAG_RE = /<\/?[A-Za-z][^>]*>/;

/** Mirrors newlife-core-api's `normalize_booking_title`: trim, then require 1-30 plain-text characters. */
export const validateBookingTitle = (value: string): BookingTitleError | null => {
  const trimmed = value.trim();
  if (trimmed.length < BOOKING_TITLE_MIN_LENGTH) {
    return "required";
  }
  if (trimmed.length > BOOKING_TITLE_MAX_LENGTH) {
    return "tooLong";
  }
  if (HTML_TAG_RE.test(trimmed)) {
    return "invalidCharacters";
  }
  return null;
};

export const isValidBookingTitle = (value: string): boolean => validateBookingTitle(value) === null;

/** i18n key (booking namespace) for each validation error, shared by every title input. */
export const BOOKING_TITLE_ERROR_KEYS: Record<BookingTitleError, string> = {
  required: "bookingTitle.errors.required",
  tooLong: "bookingTitle.errors.tooLong",
  invalidCharacters: "bookingTitle.errors.invalidCharacters",
};

export const normalizeBookingTitle = (value: string): string => value.trim();

export interface BookingTitleFieldFeedback {
  error: string | undefined;
  hint: string | undefined;
}

/** Shared touched-gating: show the localized validation error once touched, otherwise the length hint. */
export const bookingTitleFieldFeedback = (
  title: string,
  touched: boolean,
  translate: (key: string) => string
): BookingTitleFieldFeedback => {
  const error = touched ? validateBookingTitle(title) : null;
  if (error) {
    return { error: translate(BOOKING_TITLE_ERROR_KEYS[error]), hint: undefined };
  }
  return { error: undefined, hint: translate("bookingTitle.hint") };
};
