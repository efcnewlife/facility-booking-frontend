import { describe, expect, it } from "vitest";
import {
  bookAgainRoomsSearchParams,
  canShowPaymentInstructions,
  mapMemberBookingActions,
  mapMemberBookingDetail,
  parseBookingDetailId,
  timelineEventLabelKey,
} from "./bookingDetail";

const BOOKING_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

describe("parseBookingDetailId", () => {
  it("accepts a booking UUID", () => {
    expect(parseBookingDetailId(BOOKING_ID)).toBe(BOOKING_ID);
  });

  it("rejects a missing or non-UUID value", () => {
    expect(parseBookingDetailId(undefined)).toBe(null);
    expect(parseBookingDetailId("")).toBe(null);
    expect(parseBookingDetailId("not-a-uuid")).toBe(null);
  });
});

describe("mapMemberBookingActions", () => {
  it("maps camelCase and snake_case API shapes", () => {
    expect(
      mapMemberBookingActions({
        canEditTitle: true,
        can_cancel: true,
        canViewPaymentInstructions: false,
        can_book_again: true,
        bookAgainDate: "2026-10-01",
      })
    ).toEqual({
      canEditTitle: true,
      canCancel: true,
      canViewPaymentInstructions: false,
      canBookAgain: true,
      bookAgainDate: "2026-10-01",
    });
  });

  it("defaults every flag to false when actions are missing", () => {
    expect(mapMemberBookingActions(undefined)).toEqual({
      canEditTitle: false,
      canCancel: false,
      canViewPaymentInstructions: false,
      canBookAgain: false,
      bookAgainDate: null,
    });
  });
});

describe("mapMemberBookingDetail", () => {
  it("maps a full API detail payload", () => {
    const detail = mapMemberBookingDetail({
      id: BOOKING_ID,
      title: "Youth practice",
      status: "confirmed",
      bookingType: "one_time",
      startAt: "2026-10-01T18:00:00Z",
      endAt: "2026-10-01T20:00:00Z",
      ministryName: "Youth",
      remark: "Bring extra chairs",
      bookerDisplayName: "Jay Hsia",
      bookerEmail: "jay@example.com",
      quotedAmount: "85.00",
      isBooker: true,
      isViewOnly: false,
      rooms: [
        {
          id: "room-line-1",
          facilityId: "facility-1",
          facilityName: "Sanctuary",
          sequence: 0,
          startAt: "2026-10-01T18:00:00Z",
          endAt: "2026-10-01T20:00:00Z",
          lineSubtotal: "85.00",
          photoUrls: ["https://example.com/a.jpg"],
        },
      ],
      timeline: [{ kind: "created", occurredAt: "2026-09-01T00:00:00Z", reason: null }],
      actions: { canEditTitle: true, canCancel: true, canViewPaymentInstructions: true, canBookAgain: false },
    });

    expect(detail.title).toBe("Youth practice");
    expect(detail.isBooker).toBe(true);
    expect(detail.rooms).toHaveLength(1);
    expect(detail.rooms[0].facilityName).toBe("Sanctuary");
    expect(detail.timeline).toEqual([{ kind: "created", occurredAt: "2026-09-01T00:00:00Z", reason: null }]);
    expect(detail.actions.canEditTitle).toBe(true);
  });
});

describe("canShowPaymentInstructions", () => {
  const now = new Date("2026-09-18T00:00:00Z");
  const baseActions = { canEditTitle: false, canCancel: false, canBookAgain: false, bookAgainDate: null };

  it("shows instructions for an unexpired pending-payment Booker record", () => {
    expect(
      canShowPaymentInstructions(
        {
          status: "pending_payment",
          paymentHoldExpiresAt: "2026-09-19T00:00:00Z",
          actions: { ...baseActions, canViewPaymentInstructions: true },
        },
        now
      )
    ).toBe(true);
  });

  it("hides instructions once the hold has expired", () => {
    expect(
      canShowPaymentInstructions(
        {
          status: "pending_payment",
          paymentHoldExpiresAt: "2026-09-17T00:00:00Z",
          actions: { ...baseActions, canViewPaymentInstructions: true },
        },
        now
      )
    ).toBe(false);
  });

  it("hides instructions when the server denies the action", () => {
    expect(
      canShowPaymentInstructions(
        {
          status: "pending_payment",
          paymentHoldExpiresAt: "2026-09-19T00:00:00Z",
          actions: { ...baseActions, canViewPaymentInstructions: false },
        },
        now
      )
    ).toBe(false);
  });

  it("hides instructions once the booking is confirmed", () => {
    expect(
      canShowPaymentInstructions(
        {
          status: "confirmed",
          paymentHoldExpiresAt: null,
          actions: { ...baseActions, canViewPaymentInstructions: true },
        },
        now
      )
    ).toBe(false);
  });
});

describe("bookAgainRoomsSearchParams", () => {
  it("seeds only the facility-local date", () => {
    const params = bookAgainRoomsSearchParams("2026-10-01");
    expect(params.toString()).toBe("date=2026-10-01");
  });
});

describe("timelineEventLabelKey", () => {
  it("maps a known kind to its i18n key", () => {
    expect(timelineEventLabelKey("created")).toBe("bookingDetail.timeline.created");
    expect(timelineEventLabelKey("overridden")).toBe("bookingDetail.timeline.overridden");
  });

  it("falls back to a generic key for an unknown kind", () => {
    expect(timelineEventLabelKey("something_new")).toBe("bookingDetail.timeline.unknown");
  });
});
