import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RecurringBookingConflict, RecurringBookingSeriesDetail } from "@/api/services/facilityService";
import {
  buildCreateRecurringBookingSeriesPayload,
  buildPreviewRecurringBookingSeriesPayload,
} from "./recurringBookingSeries";
import {
  applyCreateFailed,
  applyCreateStarted,
  applyCreateSucceeded,
  applyPreviewStarted,
  applyPreviewSucceeded,
  applyScheduledPreview,
  buildConflictFreeReviewSummary,
  canConfirmCreate,
  canOpenReview,
  closeReview,
  createRecurringSeriesPreviewController,
  emptyRecurringSeriesReviewSnapshot,
  invalidatePreview,
  isPendingPaymentSuccess,
  openReview,
  pendingPaymentResultFromSeries,
  proposalKeyForAnswers,
  RECURRING_SERIES_PREVIEW_DEBOUNCE_MS,
  shouldPreviewProposal,
  type RecurringSeriesReviewSnapshot,
} from "./recurringSeriesReview";
import type { RecurringWhenValue, StartBookingAnswers } from "./startBookingFlow";

const blankWhen = { date: null, start: null, end: null };

const baseRecurringWhen: RecurringWhenValue = {
  weekday: 4,
  firstOccurrenceDate: "2026-08-20",
  lastOccurrenceDate: "2026-09-24",
  startTime: "09:00",
  endTime: "10:30",
  roomIds: ["room-1", "room-2"],
};

const answers = (overrides: Partial<StartBookingAnswers> = {}): StartBookingAnswers => ({
  isMinistryBooking: false,
  ministryId: null,
  frequency: "repeated",
  when: blankWhen,
  recurringWhen: baseRecurringWhen,
  ...overrides,
});

const now = new Date("2026-08-13T12:00:00");

const conflict = (overrides: Partial<RecurringBookingConflict> = {}): RecurringBookingConflict => ({
  occurrenceDate: "2026-08-20",
  kind: "occupancy",
  facilityIds: ["room-1"],
  isOverridable: false,
  ministryId: null,
  ministryStewardDisplayName: null,
  ministryStewardEmail: null,
  ...overrides,
});

const createdSeries = (overrides: Partial<RecurringBookingSeriesDetail> = {}): RecurringBookingSeriesDetail => ({
  id: "series-1",
  ministryId: null,
  firstOccurrenceDate: "2026-08-20",
  lastOccurrenceDate: "2026-09-24",
  localStartTime: "09:00:00",
  localEndTime: "10:30:00",
  status: "pending_payment",
  paymentHoldExpiresAt: "2026-08-20T16:00:00.000Z",
  quotedAmount: "150.00",
  currency: "CAD",
  occurrenceCount: 6,
  isPriority: false,
  occurrences: [
    {
      id: "occ-1",
      startAt: "2026-08-20T13:00:00.000Z",
      endAt: "2026-08-20T14:30:00.000Z",
      status: "pending_payment",
      quotedAmount: "25.00",
      currency: "CAD",
      facilityIds: ["room-1", "room-2"],
    },
  ],
  ...overrides,
});

const readyConflictFree = (): RecurringSeriesReviewSnapshot => {
  const scheduled = applyScheduledPreview(emptyRecurringSeriesReviewSnapshot(), "proposal-a", 1);
  return applyPreviewSucceeded(applyPreviewStarted(scheduled, 1), 1, "proposal-a", []);
};

describe("shouldPreviewProposal", () => {
  it("requests a full-series preview only for a complete Repeated proposal", () => {
    expect(shouldPreviewProposal(answers(), now)).toBe(true);
    expect(shouldPreviewProposal(answers({ recurringWhen: { ...baseRecurringWhen, roomIds: [] } }), now)).toBe(false);
    expect(
      shouldPreviewProposal(answers({ recurringWhen: { ...baseRecurringWhen, lastOccurrenceDate: null } }), now)
    ).toBe(false);
  });
});

describe("stale preview protection", () => {
  it("ignores a preview response whose request is no longer current", () => {
    let state = applyScheduledPreview(emptyRecurringSeriesReviewSnapshot(), "proposal-a", 1);
    state = applyScheduledPreview(state, "proposal-b", 2);
    state = applyPreviewSucceeded(state, 1, "proposal-a", [conflict()]);
    expect(state.proposalKey).toBe("proposal-b");
    expect(state.conflicts).toEqual([]);
    expect(state.previewStatus).toBe("scheduled");
  });

  it("keeps the current proposal when a later preview succeeds", () => {
    let state = applyScheduledPreview(emptyRecurringSeriesReviewSnapshot(), "proposal-a", 1);
    state = applyScheduledPreview(state, "proposal-b", 2);
    state = applyPreviewSucceeded(state, 2, "proposal-b", []);
    expect(state.proposalKey).toBe("proposal-b");
    expect(state.previewStatus).toBe("ready");
    expect(state.conflicts).toEqual([]);
  });
});

describe("mandatory review gate", () => {
  it("does not allow create from a conflict-free preview until Review is open", () => {
    const ready = readyConflictFree();
    expect(canOpenReview(ready)).toBe(true);
    expect(canConfirmCreate(ready)).toBe(false);
    expect(canConfirmCreate(openReview(ready))).toBe(true);
  });

  it("still requires Review when the preview reports no conflicts", () => {
    expect(openReview(readyConflictFree()).phase).toBe("review");
    expect(readyConflictFree().phase).toBe("selecting");
  });

  it("does not open Review from an incomplete or in-flight preview", () => {
    expect(canOpenReview(emptyRecurringSeriesReviewSnapshot())).toBe(false);
    const scheduled = applyScheduledPreview(emptyRecurringSeriesReviewSnapshot(), "proposal-a", 1);
    expect(canOpenReview(scheduled)).toBe(false);
    expect(canOpenReview(applyPreviewStarted(scheduled, 1))).toBe(false);
  });
});

describe("buildConflictFreeReviewSummary", () => {
  it("summarizes selected rooms, shared time, occurrence bounds, count, and server total", () => {
    expect(buildConflictFreeReviewSummary(answers(), ["Gym", "Chapel"], "150.00", "CAD", now)).toEqual({
      roomIds: ["room-1", "room-2"],
      roomNames: ["Gym", "Chapel"],
      startTime: "09:00",
      endTime: "10:30",
      firstOccurrenceDate: "2026-08-20",
      lastOccurrenceDate: "2026-09-24",
      weeklyOccurrenceCount: 6,
      quotedAmount: "150.00",
      currency: "CAD",
    });
  });
});

describe("create payloads from Review", () => {
  it("builds the existing create-Series request with no exclusions for a conflict-free Review", () => {
    expect(buildCreateRecurringBookingSeriesPayload(answers(), now, [])).toEqual({
      ministryId: null,
      firstOccurrenceDate: "2026-08-20",
      lastOccurrenceDate: "2026-09-24",
      localStartTime: "09:00:00",
      localEndTime: "10:30:00",
      isMissionAligned: false,
      rooms: [
        { facilityId: "room-1", sequence: 0 },
        { facilityId: "room-2", sequence: 1 },
      ],
      excludedDates: [],
    });
  });
});

describe("Pending-payment result", () => {
  it("maps a successful create to the existing Pending-payment hold explanation", () => {
    const reviewed = openReview(readyConflictFree());
    const created = applyCreateSucceeded(applyCreateStarted(reviewed), createdSeries());
    expect(isPendingPaymentSuccess(created)).toBe(true);
    expect(pendingPaymentResultFromSeries(created.createdSeries as RecurringBookingSeriesDetail)).toEqual({
      seriesId: "series-1",
      status: "pending_payment",
      quotedAmount: "150.00",
      currency: "CAD",
      paymentHoldExpiresAt: "2026-08-20T16:00:00.000Z",
      firstOccurrenceDate: "2026-08-20",
      lastOccurrenceDate: "2026-09-24",
      localStartTime: "09:00:00",
      localEndTime: "10:30:00",
      occurrenceCount: 6,
      roomIds: ["room-1", "room-2"],
    });
  });

  it("keeps Review open and does not present a Series as created when create fails", () => {
    const reviewed = openReview(readyConflictFree());
    const failed = applyCreateFailed(applyCreateStarted(reviewed), "Failed to create your booking series.");
    expect(failed.phase).toBe("review");
    expect(failed.createdSeries).toBe(null);
    expect(failed.createError).toBe("Failed to create your booking series.");
    expect(isPendingPaymentSuccess(failed)).toBe(false);
    expect(canConfirmCreate(failed)).toBe(true);
  });

  it("returns to Review without a created Series when the member closes Review", () => {
    expect(closeReview(openReview(readyConflictFree())).phase).toBe("selecting");
    expect(closeReview(openReview(readyConflictFree())).createdSeries).toBe(null);
  });
});

describe("invalidatePreview", () => {
  it("drops stale preview feedback when the proposal is no longer complete", () => {
    const invalidated = invalidatePreview(readyConflictFree());
    expect(invalidated.previewStatus).toBe("idle");
    expect(invalidated.proposalKey).toBe(null);
    expect(canOpenReview(invalidated)).toBe(false);
    expect(canConfirmCreate(invalidated)).toBe(false);
  });
});

describe("createRecurringSeriesPreviewController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces a complete proposal before requesting the full-series preview", async () => {
    const preview = vi.fn().mockResolvedValue([]);
    const controller = createRecurringSeriesPreviewController({
      preview,
      now: () => now,
      onState: vi.fn(),
    });

    controller.setProposal(answers());
    expect(preview).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(RECURRING_SERIES_PREVIEW_DEBOUNCE_MS - 1);
    expect(preview).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await Promise.resolve();

    expect(preview).toHaveBeenCalledTimes(1);
    expect(preview).toHaveBeenCalledWith(buildPreviewRecurringBookingSeriesPayload(answers(), now));
    expect(canOpenReview(controller.getState())).toBe(true);
    expect(canConfirmCreate(controller.getState())).toBe(false);
    controller.dispose();
  });

  it("does not start a preview for an incomplete proposal", async () => {
    const preview = vi.fn().mockResolvedValue([]);
    const controller = createRecurringSeriesPreviewController({
      preview,
      now: () => now,
      onState: vi.fn(),
    });
    controller.setProposal(answers({ recurringWhen: { ...baseRecurringWhen, roomIds: [] } }));
    await vi.advanceTimersByTimeAsync(RECURRING_SERIES_PREVIEW_DEBOUNCE_MS);
    expect(preview).not.toHaveBeenCalled();
    controller.dispose();
  });

  it("ignores an obsolete preview once the proposal has changed", async () => {
    let resolveFirst: ((value: RecurringBookingConflict[]) => void) | undefined;
    const preview = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<RecurringBookingConflict[]>((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockResolvedValueOnce([]);
    const controller = createRecurringSeriesPreviewController({
      preview,
      now: () => now,
      onState: vi.fn(),
    });

    controller.setProposal(answers());
    await vi.advanceTimersByTimeAsync(RECURRING_SERIES_PREVIEW_DEBOUNCE_MS);
    controller.setProposal(answers({ recurringWhen: { ...baseRecurringWhen, roomIds: ["room-1"] } }));
    await vi.advanceTimersByTimeAsync(RECURRING_SERIES_PREVIEW_DEBOUNCE_MS);
    resolveFirst?.([conflict()]);
    await Promise.resolve();
    await Promise.resolve();

    const latest = controller.getState();
    expect(latest.conflicts).toEqual([]);
    expect(latest.proposalKey).toBe(
      proposalKeyForAnswers(answers({ recurringWhen: { ...baseRecurringWhen, roomIds: ["room-1"] } }))
    );
    expect(latest.previewStatus).toBe("ready");
    controller.dispose();
  });

  it("does not open Review when the full-series preview fails", async () => {
    const preview = vi.fn().mockRejectedValue(new Error("network"));
    const controller = createRecurringSeriesPreviewController({
      preview,
      now: () => now,
      onState: vi.fn(),
    });
    controller.setProposal(answers());
    await vi.advanceTimersByTimeAsync(RECURRING_SERIES_PREVIEW_DEBOUNCE_MS);
    await Promise.resolve();
    expect(canOpenReview(controller.getState())).toBe(false);
    expect(canConfirmCreate(controller.getState())).toBe(false);
    expect(controller.getState().previewStatus).toBe("error");
    expect(controller.getState().createdSeries).toBe(null);
    controller.dispose();
  });
});
