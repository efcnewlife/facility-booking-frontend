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
  applyTitleChanged,
  buildConflictFreeReviewSummary,
  canConfirmCreate,
  canOpenReview,
  closeReview,
  createRecurringSeriesPreviewController,
  emptyRecurringSeriesReviewSnapshot,
  excludedDatesForCreate,
  invalidatePreview,
  isPendingPaymentSuccess,
  openReview,
  pendingPaymentResultFromSeries,
  proposalKeyForAnswers,
  RECURRING_SERIES_PREVIEW_DEBOUNCE_MS,
  shouldPreviewProposal,
  toggleReviewExcludedDate,
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

const noActions = {
  canEditTitle: false,
  canCancel: false,
  canViewPaymentInstructions: false,
  canBookAgain: false,
  bookAgainDate: null,
};

const createdSeries = (overrides: Partial<RecurringBookingSeriesDetail> = {}): RecurringBookingSeriesDetail => ({
  id: "series-1",
  title: "",
  ministryId: null,
  ministryName: null,
  remark: null,
  bookerDisplayName: null,
  bookerEmail: null,
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
  isBooker: true,
  isViewOnly: false,
  timeline: [],
  actions: noActions,
  occurrences: [
    {
      id: "occ-1",
      title: "",
      status: "pending_payment",
      bookingType: "recurring",
      seriesId: "series-1",
      startAt: "2026-08-20T13:00:00.000Z",
      endAt: "2026-08-20T14:30:00.000Z",
      ministryId: null,
      ministryName: null,
      remark: null,
      bookerDisplayName: null,
      bookerEmail: null,
      quotedAmount: "25.00",
      subtotalAmount: null,
      discountPercent: null,
      discountAmount: null,
      surchargeAmount: null,
      currency: "CAD",
      paymentHoldExpiresAt: "2026-08-20T16:00:00.000Z",
      isBooker: true,
      isViewOnly: false,
      rooms: [{ facilityId: "room-1" }, { facilityId: "room-2" }].map((room, index) => ({
        id: `room-line-${index}`,
        sequence: index,
        startAt: "2026-08-20T13:00:00.000Z",
        endAt: "2026-08-20T14:30:00.000Z",
        billedHours: null,
        rentalRateName: null,
        billingUnit: null,
        unitAmount: null,
        currency: "CAD",
        lineSubtotal: null,
        photoUrls: [],
        facilityName: null,
        ...room,
      })),
      timeline: [],
      actions: noActions,
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
    expect(canConfirmCreate(applyTitleChanged(openReview(ready), "Weekly choir"))).toBe(true);
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

const readyWithConflicts = (conflicts: RecurringBookingConflict[]): RecurringSeriesReviewSnapshot => {
  const scheduled = applyScheduledPreview(emptyRecurringSeriesReviewSnapshot(), "proposal-a", 1);
  return applyPreviewSucceeded(applyPreviewStarted(scheduled, 1), 1, "proposal-a", conflicts);
};

describe("conflict Review", () => {
  it("opens Review when the current preview reports conflicts", () => {
    const ready = readyWithConflicts([conflict({ kind: "blackout", isOverridable: false })]);
    expect(canOpenReview(ready)).toBe(true);
    expect(openReview(ready).phase).toBe("review");
    expect(canConfirmCreate(openReview(ready))).toBe(false);
  });

  it("lets Priority occupancy proceed without exclusion and keeps Blackout dates blocking", () => {
    const ready = readyWithConflicts([
      conflict({ occurrenceDate: "2026-08-20", kind: "occupancy", isOverridable: true }),
      conflict({ occurrenceDate: "2026-08-27", kind: "blackout", isOverridable: false }),
    ]);
    const reviewed = openReview(ready);
    expect(canConfirmCreate(reviewed)).toBe(false);
    const withoutBlackout = toggleReviewExcludedDate(reviewed, "2026-08-27");
    expect(withoutBlackout.excludedDates).toEqual(["2026-08-27"]);
    expect(canConfirmCreate(applyTitleChanged(withoutBlackout, "Weekly choir"))).toBe(true);
  });

  it("does not exclude a free or unreported date from Review", () => {
    const reviewed = openReview(readyWithConflicts([conflict({ occurrenceDate: "2026-08-27", kind: "blackout" })]));
    expect(toggleReviewExcludedDate(reviewed, "2026-08-13").excludedDates).toEqual([]);
    expect(toggleReviewExcludedDate(reviewed, "2026-08-27").excludedDates).toEqual(["2026-08-27"]);
  });
});

describe("revision and stale preview replacement", () => {
  it("returns to room selection and drops stale exclusions when the proposal changes", () => {
    const reviewed = toggleReviewExcludedDate(
      openReview(readyWithConflicts([conflict({ occurrenceDate: "2026-08-27", kind: "blackout" })])),
      "2026-08-27"
    );
    const revised = applyScheduledPreview(reviewed, "proposal-b", 2);
    expect(revised.phase).toBe("selecting");
    expect(revised.excludedDates).toEqual([]);
    expect(revised.conflicts).toEqual([]);
    expect(canConfirmCreate(revised)).toBe(false);
    expect(canOpenReview(revised)).toBe(false);
  });

  it("ignores a stale conflicting preview after the member revises rooms or schedule", () => {
    const reviewed = openReview(readyWithConflicts([conflict()]));
    const revised = applyScheduledPreview(reviewed, "proposal-b", 2);
    const stale = applyPreviewSucceeded(revised, 1, "proposal-a", [conflict({ occurrenceDate: "2026-09-03" })]);
    expect(stale.proposalKey).toBe("proposal-b");
    expect(stale.conflicts).toEqual([]);
    expect(stale.excludedDates).toEqual([]);
    expect(canConfirmCreate(stale)).toBe(false);
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
  it("builds the existing create-Series request with the Review title and no exclusions for a conflict-free Review", () => {
    expect(buildCreateRecurringBookingSeriesPayload(answers(), "Weekly choir", now, [])).toEqual({
      title: "Weekly choir",
      ministryId: null,
      firstOccurrenceDate: "2026-08-20",
      lastOccurrenceDate: "2026-09-24",
      localStartTime: "09:00:00",
      localEndTime: "10:30:00",
      rooms: [
        { facilityId: "room-1", sequence: 0 },
        { facilityId: "room-2", sequence: 1 },
      ],
      excludedDates: [],
    });
  });

  it("sends only permitted exclusions from the current preview", () => {
    const reviewed = toggleReviewExcludedDate(
      openReview(readyWithConflicts([conflict({ occurrenceDate: "2026-08-27", kind: "blackout" })])),
      "2026-08-27"
    );
    expect(excludedDatesForCreate(reviewed)).toEqual(["2026-08-27"]);
    expect(
      buildCreateRecurringBookingSeriesPayload(answers(), "Weekly choir", now, excludedDatesForCreate(reviewed))
        ?.excludedDates
    ).toEqual(["2026-08-27"]);
  });
});

describe("title validation gates create", () => {
  it("keeps create blocked on an otherwise-ready, reviewed, conflict-free proposal until the title is valid", () => {
    const reviewed = openReview(readyConflictFree());
    expect(canConfirmCreate(reviewed)).toBe(false);
    expect(canConfirmCreate(applyTitleChanged(reviewed, ""))).toBe(false);
    expect(canConfirmCreate(applyTitleChanged(reviewed, "   "))).toBe(false);
    expect(canConfirmCreate(applyTitleChanged(reviewed, "a".repeat(31)))).toBe(false);
    expect(canConfirmCreate(applyTitleChanged(reviewed, "<b>Weekly choir</b>"))).toBe(false);
    expect(canConfirmCreate(applyTitleChanged(reviewed, "Weekly choir"))).toBe(true);
  });

  it("applyTitleChanged only replaces the title, clearing a stale create error", () => {
    const reviewed = openReview(readyConflictFree());
    const withError = { ...reviewed, createError: "Failed to create your booking series." };
    const changed = applyTitleChanged(withError, "Weekly choir");
    expect(changed.title).toBe("Weekly choir");
    expect(changed.createError).toBeNull();
    expect(changed.phase).toBe(reviewed.phase);
    expect(changed.conflicts).toBe(reviewed.conflicts);
  });
});

describe("Pending-payment result", () => {
  it("maps a successful create to the existing Pending-payment hold explanation", () => {
    const reviewed = applyTitleChanged(openReview(readyConflictFree()), "Weekly choir");
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
    const reviewed = applyTitleChanged(openReview(readyConflictFree()), "Weekly choir");
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

  it("does not emit again when an incomplete proposal is already idle", () => {
    const onState = vi.fn();
    const controller = createRecurringSeriesPreviewController({
      preview: vi.fn().mockResolvedValue([]),
      now: () => now,
      onState,
    });
    const incomplete = answers({ recurringWhen: { ...baseRecurringWhen, roomIds: [] } });

    controller.setProposal(incomplete);
    controller.setProposal(incomplete);
    controller.setProposal(null);

    expect(onState).not.toHaveBeenCalled();
    expect(controller.getState()).toEqual(emptyRecurringSeriesReviewSnapshot());
    controller.dispose();
  });

  it("invalidates a ready preview once, then stays quiet while still incomplete", async () => {
    const onState = vi.fn();
    const controller = createRecurringSeriesPreviewController({
      preview: vi.fn().mockResolvedValue([]),
      now: () => now,
      onState,
    });

    controller.setProposal(answers());
    await vi.advanceTimersByTimeAsync(RECURRING_SERIES_PREVIEW_DEBOUNCE_MS);
    await Promise.resolve();
    expect(controller.getState().previewStatus).toBe("ready");
    onState.mockClear();

    const incomplete = answers({ recurringWhen: { ...baseRecurringWhen, lastOccurrenceDate: null } });
    controller.setProposal(incomplete);
    expect(onState).toHaveBeenCalledTimes(1);
    expect(controller.getState().previewStatus).toBe("idle");
    onState.mockClear();

    controller.setProposal(incomplete);
    expect(onState).not.toHaveBeenCalled();
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

  it("setTitle updates the title Review reads for canConfirmCreate", async () => {
    const controller = createRecurringSeriesPreviewController({
      preview: vi.fn().mockResolvedValue([]),
      now: () => now,
      onState: vi.fn(),
    });
    controller.setProposal(answers());
    await vi.advanceTimersByTimeAsync(RECURRING_SERIES_PREVIEW_DEBOUNCE_MS);
    await Promise.resolve();
    controller.openReview();
    expect(canConfirmCreate(controller.getState())).toBe(false);

    controller.setTitle("Weekly choir");
    expect(controller.getState().title).toBe("Weekly choir");
    expect(canConfirmCreate(controller.getState())).toBe(true);
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

  it("drops Review exclusions when the member revises the proposal", async () => {
    const preview = vi
      .fn()
      .mockResolvedValueOnce([conflict({ occurrenceDate: "2026-08-27", kind: "blackout" })])
      .mockResolvedValueOnce([]);
    const controller = createRecurringSeriesPreviewController({
      preview,
      now: () => now,
      onState: vi.fn(),
    });
    controller.setProposal(answers());
    await vi.advanceTimersByTimeAsync(RECURRING_SERIES_PREVIEW_DEBOUNCE_MS);
    await Promise.resolve();
    controller.openReview();
    controller.toggleExcludedDate("2026-08-27");
    expect(controller.getState().excludedDates).toEqual(["2026-08-27"]);

    controller.setProposal(answers({ recurringWhen: { ...baseRecurringWhen, roomIds: ["room-1"] } }));
    expect(controller.getState().phase).toBe("selecting");
    expect(controller.getState().excludedDates).toEqual([]);
    expect(canConfirmCreate(controller.getState())).toBe(false);

    await vi.advanceTimersByTimeAsync(RECURRING_SERIES_PREVIEW_DEBOUNCE_MS);
    await Promise.resolve();
    expect(canOpenReview(controller.getState())).toBe(true);
    expect(controller.getState().conflicts).toEqual([]);
    controller.dispose();
  });
});
