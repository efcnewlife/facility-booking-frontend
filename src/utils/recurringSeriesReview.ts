import type {
  PreviewRecurringBookingSeriesPayload,
  RecurringBookingConflict,
  RecurringBookingSeriesDetail,
} from "@/api/services/facilityService";
import {
  canCreateRecurringSeriesWithExclusions,
  sanitizeExcludedDates,
  toggleExcludedDate,
} from "./recurringBookingConflicts";
import { buildPreviewRecurringBookingSeriesPayload } from "./recurringBookingSeries";
import { isRecurringWhenValid, weeklyOccurrenceDates, type StartBookingAnswers } from "./startBookingFlow";

export const RECURRING_SERIES_PREVIEW_DEBOUNCE_MS = 400;

export type RecurringSeriesReviewPhase = "selecting" | "review" | "creating" | "created";

export type RecurringSeriesPreviewStatus = "idle" | "scheduled" | "loading" | "ready" | "error";

export interface RecurringSeriesReviewSnapshot {
  phase: RecurringSeriesReviewPhase;
  previewStatus: RecurringSeriesPreviewStatus;
  previewRequestId: number;
  proposalKey: string | null;
  conflicts: RecurringBookingConflict[];
  excludedDates: string[];
  quotedAmount: string | number | null;
  currency: string | null;
  createdSeries: RecurringBookingSeriesDetail | null;
  createError: string | null;
  previewError: string | null;
}

export interface ConflictFreeReviewSummary {
  roomIds: string[];
  roomNames: string[];
  startTime: string;
  endTime: string;
  firstOccurrenceDate: string;
  lastOccurrenceDate: string;
  weeklyOccurrenceCount: number;
  quotedAmount: string | number | null;
  currency: string | null;
}

export interface PendingPaymentResult {
  seriesId: string;
  status: string;
  quotedAmount: string | number | null;
  currency: string | null;
  paymentHoldExpiresAt: string | null;
  firstOccurrenceDate: string;
  lastOccurrenceDate: string;
  localStartTime: string;
  localEndTime: string;
  occurrenceCount: number;
  roomIds: string[];
}

export const emptyRecurringSeriesReviewSnapshot = (): RecurringSeriesReviewSnapshot => ({
  phase: "selecting",
  previewStatus: "idle",
  previewRequestId: 0,
  proposalKey: null,
  conflicts: [],
  excludedDates: [],
  quotedAmount: null,
  currency: null,
  createdSeries: null,
  createError: null,
  previewError: null,
});

export const shouldPreviewProposal = (answers: StartBookingAnswers, now: Date): boolean => {
  return answers.frequency === "repeated" && isRecurringWhenValid(answers.recurringWhen, now);
};

export const proposalKeyForAnswers = (answers: StartBookingAnswers): string | null => {
  const { firstOccurrenceDate, lastOccurrenceDate, startTime, endTime, roomIds } = answers.recurringWhen;
  if (!firstOccurrenceDate || !lastOccurrenceDate || !startTime || !endTime || roomIds.length === 0) {
    return null;
  }
  const ministryId = answers.isMinistryBooking && answers.ministryId ? answers.ministryId : "";
  return `${firstOccurrenceDate}|${lastOccurrenceDate}|${startTime}|${endTime}|${roomIds.join(",")}|${ministryId}`;
};

export const buildConflictFreeReviewSummary = (
  answers: StartBookingAnswers,
  roomNames: string[],
  quotedAmount: string | number | null,
  currency: string | null,
  now: Date = new Date()
): ConflictFreeReviewSummary | null => {
  if (!isRecurringWhenValid(answers.recurringWhen, now)) {
    return null;
  }
  const { firstOccurrenceDate, lastOccurrenceDate, startTime, endTime, roomIds } = answers.recurringWhen;
  return {
    roomIds,
    roomNames,
    startTime: startTime as string,
    endTime: endTime as string,
    firstOccurrenceDate: firstOccurrenceDate as string,
    lastOccurrenceDate: lastOccurrenceDate as string,
    weeklyOccurrenceCount: weeklyOccurrenceDates(firstOccurrenceDate as string, lastOccurrenceDate as string).length,
    quotedAmount,
    currency,
  };
};

export const applyScheduledPreview = (
  state: RecurringSeriesReviewSnapshot,
  proposalKey: string,
  requestId: number
): RecurringSeriesReviewSnapshot => ({
  ...state,
  phase: state.phase === "created" ? state.phase : "selecting",
  previewStatus: "scheduled",
  previewRequestId: requestId,
  proposalKey,
  conflicts: [],
  excludedDates: [],
  quotedAmount: null,
  currency: null,
  createdSeries: state.phase === "created" ? state.createdSeries : null,
  createError: null,
  previewError: null,
});

export const applyPreviewStarted = (
  state: RecurringSeriesReviewSnapshot,
  requestId: number
): RecurringSeriesReviewSnapshot => {
  if (requestId !== state.previewRequestId) {
    return state;
  }
  return { ...state, previewStatus: "loading", previewError: null };
};

export const applyPreviewSucceeded = (
  state: RecurringSeriesReviewSnapshot,
  requestId: number,
  proposalKey: string,
  conflicts: RecurringBookingConflict[],
  quotedAmount: string | number | null = null,
  currency: string | null = null
): RecurringSeriesReviewSnapshot => {
  if (requestId !== state.previewRequestId || proposalKey !== state.proposalKey) {
    return state;
  }
  return {
    ...state,
    previewStatus: "ready",
    conflicts,
    excludedDates: [],
    quotedAmount,
    currency,
    previewError: null,
  };
};

export const applyPreviewFailed = (
  state: RecurringSeriesReviewSnapshot,
  requestId: number,
  proposalKey: string,
  error: string
): RecurringSeriesReviewSnapshot => {
  if (requestId !== state.previewRequestId || proposalKey !== state.proposalKey) {
    return state;
  }
  return {
    ...state,
    previewStatus: "error",
    conflicts: [],
    excludedDates: [],
    quotedAmount: null,
    currency: null,
    previewError: error,
  };
};

export const invalidatePreview = (state: RecurringSeriesReviewSnapshot): RecurringSeriesReviewSnapshot => ({
  ...emptyRecurringSeriesReviewSnapshot(),
  previewRequestId: state.previewRequestId,
});

export const canOpenReview = (state: RecurringSeriesReviewSnapshot): boolean => {
  return state.previewStatus === "ready" && state.phase !== "creating" && state.phase !== "created";
};

export const openReview = (state: RecurringSeriesReviewSnapshot): RecurringSeriesReviewSnapshot => {
  if (!canOpenReview(state)) {
    return state;
  }
  return { ...state, phase: "review", createError: null };
};

export const closeReview = (state: RecurringSeriesReviewSnapshot): RecurringSeriesReviewSnapshot => {
  if (state.phase !== "review" && state.phase !== "creating") {
    return state;
  }
  return { ...state, phase: "selecting", createError: null };
};

export const canConfirmCreate = (state: RecurringSeriesReviewSnapshot): boolean => {
  return (
    state.phase === "review" &&
    state.previewStatus === "ready" &&
    state.createdSeries === null &&
    canCreateRecurringSeriesWithExclusions(state.conflicts, state.excludedDates)
  );
};

export const toggleReviewExcludedDate = (
  state: RecurringSeriesReviewSnapshot,
  occurrenceDate: string
): RecurringSeriesReviewSnapshot => {
  if (state.phase !== "review" || state.previewStatus !== "ready") {
    return state;
  }
  return {
    ...state,
    excludedDates: toggleExcludedDate(state.conflicts, state.excludedDates, occurrenceDate),
    createError: null,
  };
};

export const excludedDatesForCreate = (state: RecurringSeriesReviewSnapshot): string[] => {
  return sanitizeExcludedDates(state.conflicts, state.excludedDates);
};

export const applyCreateStarted = (state: RecurringSeriesReviewSnapshot): RecurringSeriesReviewSnapshot => {
  if (!canConfirmCreate(state)) {
    return state;
  }
  return { ...state, phase: "creating", createError: null };
};

export const applyCreateSucceeded = (
  state: RecurringSeriesReviewSnapshot,
  series: RecurringBookingSeriesDetail
): RecurringSeriesReviewSnapshot => {
  if (state.phase !== "creating") {
    return state;
  }
  return {
    ...state,
    phase: "created",
    createdSeries: series,
    createError: null,
  };
};

export const applyCreateFailed = (
  state: RecurringSeriesReviewSnapshot,
  error: string
): RecurringSeriesReviewSnapshot => {
  if (state.phase !== "creating") {
    return state;
  }
  return {
    ...state,
    phase: "review",
    createdSeries: null,
    createError: error,
  };
};

export const isPendingPaymentSuccess = (state: RecurringSeriesReviewSnapshot): boolean => {
  return state.phase === "created" && state.createdSeries?.status === "pending_payment";
};

export const pendingPaymentResultFromSeries = (series: RecurringBookingSeriesDetail): PendingPaymentResult => ({
  seriesId: series.id,
  status: series.status,
  quotedAmount: series.quotedAmount,
  currency: series.currency,
  paymentHoldExpiresAt: series.paymentHoldExpiresAt,
  firstOccurrenceDate: series.firstOccurrenceDate,
  lastOccurrenceDate: series.lastOccurrenceDate,
  localStartTime: series.localStartTime,
  localEndTime: series.localEndTime,
  occurrenceCount: series.occurrenceCount,
  roomIds: series.occurrences[0]?.facilityIds ?? [],
});

export interface RecurringSeriesPreviewControllerDeps {
  preview: (payload: PreviewRecurringBookingSeriesPayload) => Promise<RecurringBookingConflict[]>;
  now?: () => Date;
  debounceMs?: number;
  onState?: (state: RecurringSeriesReviewSnapshot) => void;
}

export const createRecurringSeriesPreviewController = (deps: RecurringSeriesPreviewControllerDeps) => {
  const debounceMs = deps.debounceMs ?? RECURRING_SERIES_PREVIEW_DEBOUNCE_MS;
  let state = emptyRecurringSeriesReviewSnapshot();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let nextRequestId = 0;
  let latestAnswers: StartBookingAnswers | null = null;

  const emit = (next: RecurringSeriesReviewSnapshot) => {
    state = next;
    deps.onState?.(state);
  };

  const clearTimer = () => {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const currentNow = () => deps.now?.() ?? new Date();

  const runPreview = async (requestId: number, proposalKey: string, answers: StartBookingAnswers) => {
    const payload = buildPreviewRecurringBookingSeriesPayload(answers, currentNow());
    if (!payload) {
      emit(invalidatePreview({ ...state, previewRequestId: requestId }));
      return;
    }
    emit(applyPreviewStarted(state, requestId));
    try {
      const conflicts = await deps.preview(payload);
      emit(applyPreviewSucceeded(state, requestId, proposalKey, conflicts));
    } catch (error) {
      emit(
        applyPreviewFailed(
          state,
          requestId,
          proposalKey,
          error instanceof Error ? error.message : "Failed to preview recurring booking series"
        )
      );
    }
  };

  return {
    getState: () => state,
    openReview: () => {
      emit(openReview(state));
    },
    closeReview: () => {
      emit(closeReview(state));
    },
    toggleExcludedDate: (occurrenceDate: string) => {
      emit(toggleReviewExcludedDate(state, occurrenceDate));
    },
    beginCreate: () => {
      emit(applyCreateStarted(state));
    },
    succeedCreate: (series: RecurringBookingSeriesDetail) => {
      emit(applyCreateSucceeded(state, series));
    },
    failCreate: (error: string) => {
      emit(applyCreateFailed(state, error));
    },
    setProposal: (answers: StartBookingAnswers | null) => {
      latestAnswers = answers;
      if (!answers || !shouldPreviewProposal(answers, currentNow())) {
        clearTimer();
        nextRequestId += 1;
        emit(invalidatePreview({ ...state, previewRequestId: nextRequestId }));
        return;
      }
      const key = proposalKeyForAnswers(answers);
      if (!key) {
        return;
      }
      if (
        state.proposalKey === key &&
        (state.previewStatus === "scheduled" || state.previewStatus === "loading" || state.previewStatus === "ready")
      ) {
        return;
      }
      clearTimer();
      nextRequestId += 1;
      const requestId = nextRequestId;
      emit(applyScheduledPreview(state, key, requestId));
      timer = setTimeout(() => {
        timer = null;
        void runPreview(requestId, key, latestAnswers ?? answers);
      }, debounceMs);
    },
    dispose: () => {
      clearTimer();
      nextRequestId += 1;
    },
  };
};
