import { describe, expect, it, vi } from "vitest";

const { mockHttpClient } = vi.hoisted(() => ({
  mockHttpClient: { get: vi.fn(), post: vi.fn() },
}));

vi.mock("./httpClient", () => ({
  httpClient: mockHttpClient,
  default: mockHttpClient,
}));

import { BookingSeriesDraftNotConfirmableError, facilityService } from "./facilityService";

const DRAFT_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

const apiDraftResponse = (overrides: Record<string, unknown> = {}) => ({
  success: true,
  data: {
    id: DRAFT_ID,
    occurrence_count: 5,
    payment_hold_expires_at: "2026-08-22T16:00:00.000Z",
    ...overrides,
  },
});

describe("facilityService.getBookingSeriesDraft pending payment hold mapping", () => {
  it("reads the calendar-day hold count from the camelCase response field", async () => {
    mockHttpClient.get.mockResolvedValueOnce(apiDraftResponse({ pendingPaymentHoldDays: 3 }));

    const draft = await facilityService.getBookingSeriesDraft(DRAFT_ID);

    expect(draft.pendingPaymentHoldDays).toBe(3);
    expect(draft.paymentHoldExpiresAt).toBe("2026-08-22T16:00:00.000Z");
  });

  it("falls back to the snake_case response field", async () => {
    mockHttpClient.get.mockResolvedValueOnce(apiDraftResponse({ pending_payment_hold_days: 3 }));

    const draft = await facilityService.getBookingSeriesDraft(DRAFT_ID);

    expect(draft.pendingPaymentHoldDays).toBe(3);
  });

  it("no longer reads the retired hold-hours response field", async () => {
    mockHttpClient.get.mockResolvedValueOnce(
      apiDraftResponse({ pendingPaymentHoldHours: 48, pending_payment_hold_hours: 48 })
    );

    const draft = await facilityService.getBookingSeriesDraft(DRAFT_ID);

    expect(draft.pendingPaymentHoldDays).toBe(0);
    expect((draft as unknown as Record<string, unknown>).pendingPaymentHoldHours).toBeUndefined();
  });
});

describe("facilityService.getBookingDraft Override review mapping", () => {
  it("maps the serialized Draft evaluation the Core API returns", async () => {
    mockHttpClient.get.mockResolvedValueOnce({
      success: true,
      data: {
        id: DRAFT_ID,
        date: "2026-09-01",
        title: "Youth night",
        ministryId: "ministry-1",
        lines: [
          {
            facilityId: "chapel-id",
            startAt: "2026-09-01T14:00:00Z",
            endAt: "2026-09-01T15:00:00Z",
            sequence: 1,
            isAvailable: false,
          },
        ],
        isConfirmable: true,
        conflicts: [
          {
            facilityId: "hall-id",
            startAt: "2026-09-01T14:00:00Z",
            endAt: "2026-09-01T15:00:00Z",
            kind: "ministry",
            ministryName: "Choir",
            contactDisplayName: "Ada Steward",
            contactEmail: "ada@efcnewlife.org",
          },
        ],
        overrideImpacts: [
          {
            bookingId: "rental-1",
            isSeriesOccurrence: true,
            startAt: "2026-09-01T14:00:00Z",
            endAt: "2026-09-01T18:00:00Z",
            releasedIntervals: [
              { facilityId: "chapel-id", startAt: "2026-09-01T14:00:00Z", endAt: "2026-09-01T15:00:00Z" },
              { facilityId: "gym-id", startAt: "2026-09-01T17:00:00Z", endAt: "2026-09-01T18:00:00Z" },
            ],
          },
        ],
        overrideReviewToken: "opaque-token",
      },
    });

    const draft = await facilityService.getBookingDraft(DRAFT_ID);

    expect(draft.isConfirmable).toBe(true);
    expect(draft.overrideReviewToken).toBe("opaque-token");
    expect(draft.conflicts).toEqual([
      {
        facilityId: "hall-id",
        startAt: "2026-09-01T14:00:00Z",
        endAt: "2026-09-01T15:00:00Z",
        kind: "ministry",
        ministryName: "Choir",
        contactDisplayName: "Ada Steward",
        contactEmail: "ada@efcnewlife.org",
      },
    ]);
    expect(draft.overrideImpacts).toEqual([
      {
        bookingId: "rental-1",
        isSeriesOccurrence: true,
        startAt: "2026-09-01T14:00:00Z",
        endAt: "2026-09-01T18:00:00Z",
        releasedIntervals: [
          { facilityId: "chapel-id", startAt: "2026-09-01T14:00:00Z", endAt: "2026-09-01T15:00:00Z" },
          { facilityId: "gym-id", startAt: "2026-09-01T17:00:00Z", endAt: "2026-09-01T18:00:00Z" },
        ],
      },
    ]);
  });

  it("treats a Draft without review fields as confirmable with no impact or token", async () => {
    mockHttpClient.get.mockResolvedValueOnce({
      success: true,
      data: { id: DRAFT_ID, date: "2026-09-01", title: "Choir", lines: [] },
    });

    const draft = await facilityService.getBookingDraft(DRAFT_ID);

    expect(draft.isConfirmable).toBe(true);
    expect(draft.conflicts).toEqual([]);
    expect(draft.overrideImpacts).toEqual([]);
    expect(draft.overrideReviewToken).toBeNull();
  });
});

describe("facilityService Recurring Series Draft Override review", () => {
  it("maps whole-Booking impacts, the review token, and authorized Rental contacts", async () => {
    mockHttpClient.get.mockResolvedValueOnce(
      apiDraftResponse({
        conflicts: [
          {
            occurrenceDate: "2099-01-15",
            kind: "occupancy",
            facilityIds: ["gym-id"],
            isOverridable: false,
            bookerDisplayName: "Ben Booker",
            bookerEmail: "ben@example.com",
          },
          { occurrence_date: "2099-01-22", kind: "opening_hours", facility_ids: ["gym-id"] },
        ],
        overrideImpacts: [
          {
            bookingId: "rental-1",
            isSeriesOccurrence: true,
            startAt: "2099-01-08T09:00:00-05:00",
            endAt: "2099-01-08T12:00:00-05:00",
            releasedIntervals: [
              { facilityId: "gym-id", startAt: "2099-01-08T09:00:00-05:00", endAt: "2099-01-08T10:30:00-05:00" },
              { facilityId: "room-2", startAt: "2099-01-08T11:00:00-05:00", endAt: "2099-01-08T12:00:00-05:00" },
            ],
          },
        ],
        overrideReviewToken: "series-review-1",
      })
    );

    const draft = await facilityService.getBookingSeriesDraft(DRAFT_ID);

    expect(draft.overrideReviewToken).toBe("series-review-1");
    expect(draft.overrideImpacts).toEqual([
      {
        bookingId: "rental-1",
        isSeriesOccurrence: true,
        startAt: "2099-01-08T09:00:00-05:00",
        endAt: "2099-01-08T12:00:00-05:00",
        releasedIntervals: [
          { facilityId: "gym-id", startAt: "2099-01-08T09:00:00-05:00", endAt: "2099-01-08T10:30:00-05:00" },
          { facilityId: "room-2", startAt: "2099-01-08T11:00:00-05:00", endAt: "2099-01-08T12:00:00-05:00" },
        ],
      },
    ]);
    expect(draft.conflicts[0]).toMatchObject({ bookerDisplayName: "Ben Booker", bookerEmail: "ben@example.com" });
    expect(draft.conflicts[1]).toMatchObject({ kind: "opening_hours", bookerDisplayName: null, bookerEmail: null });
  });

  it("treats a Series Draft without review fields as having no impact or token", async () => {
    mockHttpClient.get.mockResolvedValueOnce(apiDraftResponse());

    const draft = await facilityService.getBookingSeriesDraft(DRAFT_ID);

    expect(draft.overrideImpacts).toEqual([]);
    expect(draft.overrideReviewToken).toBeNull();
  });

  it("sends the reviewed token on confirmation only when one is given", async () => {
    mockHttpClient.post.mockResolvedValue({ success: true, data: { id: "series-1" } });

    await facilityService.confirmBookingSeriesDraft(DRAFT_ID, "series-review-1");
    await facilityService.confirmBookingSeriesDraft(DRAFT_ID);

    expect(mockHttpClient.post.mock.calls[0][1]).toEqual({ overrideReviewToken: "series-review-1" });
    expect(mockHttpClient.post.mock.calls[1][1]).toBeUndefined();
  });

  it("keeps review and scheduling-conflict errors distinct from a not-confirmable Draft", async () => {
    const reviewStale = {
      code: 409,
      message: "Stale",
      details: { error_code: "FACILITY_BOOKING_OVERRIDE_REVIEW_STALE" },
    };
    const schedulingConflict = {
      code: 409,
      message: "Conflict",
      details: { error_code: "FACILITY_BOOKING_SCHEDULING_CONFLICT" },
    };
    const notConfirmable = {
      code: 409,
      message: "Not confirmable",
      details: { error_code: "FACILITY_BOOKING_SERIES_DRAFT_NOT_CONFIRMABLE" },
    };
    mockHttpClient.post
      .mockRejectedValueOnce(reviewStale)
      .mockRejectedValueOnce(schedulingConflict)
      .mockRejectedValueOnce(notConfirmable);

    await expect(facilityService.confirmBookingSeriesDraft(DRAFT_ID, "series-review-1")).rejects.toBe(reviewStale);
    await expect(facilityService.confirmBookingSeriesDraft(DRAFT_ID, "series-review-1")).rejects.toBe(
      schedulingConflict
    );
    await expect(facilityService.confirmBookingSeriesDraft(DRAFT_ID)).rejects.toBeInstanceOf(
      BookingSeriesDraftNotConfirmableError
    );
  });
});
