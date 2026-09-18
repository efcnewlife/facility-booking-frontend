export const CANCELLATION_REASON_MIN_LENGTH = 1;
export const CANCELLATION_REASON_MAX_LENGTH = 250;

export type CancellationReasonError = "required" | "tooLong";

/** Mirrors newlife-core-api's `normalize_member_cancellation_reason`: trim, then require 1-250 characters. */
export const validateCancellationReason = (value: string): CancellationReasonError | null => {
  const trimmed = value.trim();
  if (trimmed.length < CANCELLATION_REASON_MIN_LENGTH) {
    return "required";
  }
  if (trimmed.length > CANCELLATION_REASON_MAX_LENGTH) {
    return "tooLong";
  }
  return null;
};

export const isValidCancellationReason = (value: string): boolean => validateCancellationReason(value) === null;

export const normalizeCancellationReason = (value: string): string => value.trim();

/** i18n key (booking namespace) for each validation error, shared by every cancellation reason field. */
export const CANCELLATION_REASON_ERROR_KEYS: Record<CancellationReasonError, string> = {
  required: "cancellationReason.errors.required",
  tooLong: "cancellationReason.errors.tooLong",
};

export interface CancellationReasonFieldFeedback {
  error: string | undefined;
}

/** Shared touched-gating: show the localized validation error once touched, otherwise nothing. */
export const cancellationReasonFieldFeedback = (
  reason: string,
  touched: boolean,
  translate: (key: string) => string
): CancellationReasonFieldFeedback => {
  const error = touched ? validateCancellationReason(reason) : null;
  return { error: error ? translate(CANCELLATION_REASON_ERROR_KEYS[error]) : undefined };
};
