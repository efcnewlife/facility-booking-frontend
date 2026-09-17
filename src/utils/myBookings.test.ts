import { describe, expect, it } from "vitest";
import type { MemberBookingListItem } from "@/types/myBookings";
import {
  affectedOccurrencesForScope,
  groupMyBookings,
  isCancellableOccurrence,
  mapMemberBookingList,
  RECURRING_CANCELLATION_SCOPE,
  resolveOccurrenceDisplayStatus,
  resolveSeriesDisplayStatus,
  SERIES_DISPLAY_STATUS,
} from "./myBookings";

const now = new Date("2026-09-17T16:00:00.000Z");

const booking = (overrides: Partial<MemberBookingListItem> = {}): MemberBookingListItem => ({
  id: "booking-1",
  seriesId: null,
  facilityId: "room-1",
  facilityName: "Sanctuary",
  bookingType: "one_time",
  startAt: "2026-09-20T13:00:00.000Z",
  endAt: "2026-09-20T14:30:00.000Z",
  status: "confirmed",
  quotedAmount: "40.00",
  currency: "CAD",
  ...overrides,
});

const occurrence = (
  overrides: Partial<{
    id: string;
    startAt: string;
    endAt: string;
    status: string;
  }> = {}
) => ({
  id: "occ-1",
  startAt: "2026-09-20T13:00:00.000Z",
  endAt: "2026-09-20T14:30:00.000Z",
  status: "confirmed",
  ...overrides,
});

describe("mapMemberBookingList", () => {
  it("reads seriesId from camelCase or snake_case list rows", () => {
    expect(
      mapMemberBookingList({
        items: [
          {
            id: "occ-1",
            seriesId: "series-1",
            facilityName: "Gym",
            bookingType: "recurring",
            startAt: "2026-09-24T13:00:00.000Z",
            endAt: "2026-09-24T14:30:00.000Z",
            status: "confirmed",
            quotedAmount: "40.00",
            currency: "CAD",
          },
          {
            id: "occ-2",
            series_id: "series-1",
            facility_name: "Gym",
            booking_type: "recurring",
            start_at: "2026-10-01T13:00:00.000Z",
            end_at: "2026-10-01T14:30:00.000Z",
            status: "pending_payment",
            quoted_amount: "40.00",
            currency: "CAD",
          },
        ],
      })
    ).toEqual([
      {
        id: "occ-1",
        seriesId: "series-1",
        facilityId: null,
        facilityName: "Gym",
        bookingType: "recurring",
        startAt: "2026-09-24T13:00:00.000Z",
        endAt: "2026-09-24T14:30:00.000Z",
        status: "confirmed",
        quotedAmount: "40.00",
        currency: "CAD",
      },
      {
        id: "occ-2",
        seriesId: "series-1",
        facilityId: null,
        facilityName: "Gym",
        bookingType: "recurring",
        startAt: "2026-10-01T13:00:00.000Z",
        endAt: "2026-10-01T14:30:00.000Z",
        status: "pending_payment",
        quotedAmount: "40.00",
        currency: "CAD",
      },
    ]);
  });
});

describe("groupMyBookings", () => {
  it("groups materialized recurring occurrences under their Series", () => {
    const items = [
      booking({
        id: "occ-a",
        seriesId: "series-1",
        bookingType: "recurring",
        startAt: "2026-09-24T13:00:00.000Z",
        facilityName: "Gym",
      }),
      booking({
        id: "one-time",
        seriesId: null,
        bookingType: "one_time",
        startAt: "2026-09-18T15:00:00.000Z",
        facilityName: "Sanctuary",
      }),
      booking({
        id: "occ-b",
        seriesId: "series-1",
        bookingType: "recurring",
        startAt: "2026-10-01T13:00:00.000Z",
        facilityName: "Gym",
      }),
    ];

    const grouped = groupMyBookings(items, now);

    expect(grouped.upcoming).toEqual([
      {
        kind: "one_time",
        booking: items[1],
      },
      {
        kind: "series",
        seriesId: "series-1",
        occurrences: [items[0], items[2]],
      },
    ]);
    expect(grouped.past).toEqual([]);
  });

  it("puts a Series with only past occurrences into past Bookings", () => {
    const items = [
      booking({
        id: "past-occ-1",
        seriesId: "series-past",
        bookingType: "recurring",
        startAt: "2026-08-06T13:00:00.000Z",
        status: "cancelled",
      }),
      booking({
        id: "past-occ-2",
        seriesId: "series-past",
        bookingType: "recurring",
        startAt: "2026-08-13T13:00:00.000Z",
        status: "confirmed",
      }),
    ];

    const grouped = groupMyBookings(items, now);

    expect(grouped.upcoming).toEqual([]);
    expect(grouped.past).toEqual([
      {
        kind: "series",
        seriesId: "series-past",
        occurrences: [items[0], items[1]],
      },
    ]);
  });

  it("keeps a mixed Series in upcoming and does not duplicate it in past", () => {
    const items = [
      booking({
        id: "past-occ",
        seriesId: "series-mixed",
        bookingType: "recurring",
        startAt: "2026-09-10T13:00:00.000Z",
      }),
      booking({
        id: "future-occ",
        seriesId: "series-mixed",
        bookingType: "recurring",
        startAt: "2026-09-24T13:00:00.000Z",
      }),
    ];

    const grouped = groupMyBookings(items, now);

    expect(grouped.upcoming).toEqual([
      {
        kind: "series",
        seriesId: "series-mixed",
        occurrences: [items[0], items[1]],
      },
    ]);
    expect(grouped.past).toEqual([]);
  });

  it("leaves a Recurring occurrence without seriesId ungrouped", () => {
    const item = booking({
      id: "orphan",
      seriesId: null,
      bookingType: "recurring",
      startAt: "2026-09-20T13:00:00.000Z",
    });

    expect(groupMyBookings([item], now).upcoming).toEqual([{ kind: "one_time", booking: item }]);
  });
});

describe("affectedOccurrencesForScope", () => {
  const occurrences = [
    occurrence({ id: "hist", startAt: "2026-09-10T13:00:00.000Z", status: "confirmed" }),
    occurrence({ id: "pivot", startAt: "2026-09-24T13:00:00.000Z", status: "confirmed" }),
    occurrence({ id: "later-cancelled", startAt: "2026-10-01T13:00:00.000Z", status: "cancelled" }),
    occurrence({ id: "later", startAt: "2026-10-08T13:00:00.000Z", status: "pending_payment" }),
    occurrence({ id: "overridden", startAt: "2026-10-15T13:00:00.000Z", status: "overridden" }),
  ];

  it("selects only the chosen live future occurrence", () => {
    expect(
      affectedOccurrencesForScope(occurrences, RECURRING_CANCELLATION_SCOPE.OCCURRENCE, "pivot", now).map(
        (item) => item.id
      )
    ).toEqual(["pivot"]);
  });

  it("selects the chosen occurrence and every later live occurrence", () => {
    expect(
      affectedOccurrencesForScope(occurrences, RECURRING_CANCELLATION_SCOPE.THIS_AND_FUTURE, "pivot", now).map(
        (item) => item.id
      )
    ).toEqual(["pivot", "later"]);
  });

  it("selects every remaining live future occurrence for the entire Series", () => {
    expect(
      affectedOccurrencesForScope(occurrences, RECURRING_CANCELLATION_SCOPE.ENTIRE_SERIES, null, now).map(
        (item) => item.id
      )
    ).toEqual(["pivot", "later"]);
  });

  it("does not treat historical, cancelled, or overridden occurrences as cancellable", () => {
    expect(isCancellableOccurrence(occurrences[0], now)).toBe(false);
    expect(isCancellableOccurrence(occurrences[2], now)).toBe(false);
    expect(isCancellableOccurrence(occurrences[4], now)).toBe(false);
    expect(isCancellableOccurrence(occurrences[1], now)).toBe(true);
  });
});

describe("resolveSeriesDisplayStatus", () => {
  it("shows an elapsed Pending-payment hold as expired without a client timer", () => {
    expect(
      resolveSeriesDisplayStatus({ status: "pending_payment", paymentHoldExpiresAt: "2026-09-17T15:59:59.000Z" }, now)
    ).toBe(SERIES_DISPLAY_STATUS.EXPIRED);
  });

  it("keeps an unexpired Pending-payment Series pending", () => {
    expect(
      resolveSeriesDisplayStatus({ status: "pending_payment", paymentHoldExpiresAt: "2026-09-20T16:00:00.000Z" }, now)
    ).toBe(SERIES_DISPLAY_STATUS.PENDING_PAYMENT);
  });

  it("keeps a Pending-payment Series with no deadline pending", () => {
    expect(resolveSeriesDisplayStatus({ status: "pending_payment", paymentHoldExpiresAt: null }, now)).toBe(
      SERIES_DISPLAY_STATUS.PENDING_PAYMENT
    );
  });

  it("passes confirmed and cancelled Series through", () => {
    expect(resolveSeriesDisplayStatus({ status: "confirmed", paymentHoldExpiresAt: null }, now)).toBe(
      SERIES_DISPLAY_STATUS.CONFIRMED
    );
    expect(resolveSeriesDisplayStatus({ status: "cancelled", paymentHoldExpiresAt: null }, now)).toBe(
      SERIES_DISPLAY_STATUS.CANCELLED
    );
  });
});

describe("resolveOccurrenceDisplayStatus", () => {
  it("shows a Pending-payment occurrence as expired when the Series hold has elapsed", () => {
    expect(
      resolveOccurrenceDisplayStatus(
        { status: "pending_payment" },
        { status: "pending_payment", paymentHoldExpiresAt: "2026-09-17T15:00:00.000Z" },
        now
      )
    ).toBe(SERIES_DISPLAY_STATUS.EXPIRED);
  });

  it("keeps overridden and cancelled occurrence states", () => {
    const series = { status: "confirmed", paymentHoldExpiresAt: null };
    expect(resolveOccurrenceDisplayStatus({ status: "overridden" }, series, now)).toBe("overridden");
    expect(resolveOccurrenceDisplayStatus({ status: "cancelled" }, series, now)).toBe("cancelled");
  });
});
