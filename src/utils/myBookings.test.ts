import { describe, expect, it } from "vitest";
import {
  MY_BOOKINGS_CARD_KIND,
  MY_BOOKINGS_SECTION,
  type MemberBookingListItem,
  type MyBookingsBrowseCard,
} from "@/types/myBookings";
import {
  affectedOccurrencesForScope,
  applyBrowsePage,
  browseCardKey,
  browseCardPrimaryFacilityName,
  canCancelOneTimeCard,
  canCancelSeriesCard,
  displayStatusForBrowseItem,
  hasMoreBrowsePages,
  INITIAL_MY_BOOKINGS_SECTION_STATE,
  isCancellableOccurrence,
  mapBrowsePage,
  MY_BOOKINGS_SECTIONS,
  RECURRING_CANCELLATION_SCOPE,
  resolveOccurrenceDisplayStatus,
  resolveSeriesDisplayStatus,
  SERIES_DISPLAY_STATUS,
} from "./myBookings";

const now = new Date("2026-09-17T16:00:00.000Z");

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

describe("displayStatusForBrowseItem", () => {
  it("relabels a Pending-payment row as expired only in the Cancelled or Expired section", () => {
    expect(displayStatusForBrowseItem("pending_payment", MY_BOOKINGS_SECTION.CANCELLED_OR_EXPIRED)).toBe("expired");
  });

  it("leaves a live Pending-payment row alone in Upcoming", () => {
    expect(displayStatusForBrowseItem("pending_payment", MY_BOOKINGS_SECTION.UPCOMING)).toBe("pending_payment");
  });

  it("passes every other status through unchanged", () => {
    expect(displayStatusForBrowseItem("cancelled", MY_BOOKINGS_SECTION.CANCELLED_OR_EXPIRED)).toBe("cancelled");
    expect(displayStatusForBrowseItem("overridden", MY_BOOKINGS_SECTION.OVERRIDDEN)).toBe("overridden");
  });
});

describe("MY_BOOKINGS_SECTIONS", () => {
  it("lists Upcoming, Overridden, Past, and Cancelled or Expired in that order", () => {
    expect(MY_BOOKINGS_SECTIONS.map((entry) => entry.section)).toEqual([
      MY_BOOKINGS_SECTION.UPCOMING,
      MY_BOOKINGS_SECTION.OVERRIDDEN,
      MY_BOOKINGS_SECTION.PAST,
      MY_BOOKINGS_SECTION.CANCELLED_OR_EXPIRED,
    ]);
  });

  it("expands only Upcoming initially", () => {
    expect(MY_BOOKINGS_SECTIONS.filter((entry) => entry.defaultExpanded).map((entry) => entry.section)).toEqual([
      MY_BOOKINGS_SECTION.UPCOMING,
    ]);
  });
});

describe("mapBrowsePage", () => {
  it("reads a one-time card from camelCase or snake_case fields", () => {
    const result = mapBrowsePage({
      page: 0,
      pageSize: 20,
      total: 1,
      section: "upcoming",
      items: [
        {
          kind: "one_time",
          isBooker: false,
          isViewOnly: true,
          photoUrls: ["https://cdn.example/a.jpg"],
          booking: {
            id: "booking-1",
            title: "Ministry rehearsal",
            facility_id: "room-1",
            facility_name: "Gym",
            booking_type: "one_time",
            start_at: "2026-10-01T14:00:00.000Z",
            end_at: "2026-10-01T16:00:00.000Z",
            status: "confirmed",
            quoted_amount: "40.00",
            currency: "CAD",
          },
        },
      ],
    });

    expect(result).toEqual({
      section: "upcoming",
      page: 0,
      pageSize: 20,
      total: 1,
      items: [
        {
          kind: "one_time",
          isBooker: false,
          isViewOnly: true,
          photoUrls: ["https://cdn.example/a.jpg"],
          booking: {
            id: "booking-1",
            title: "Ministry rehearsal",
            seriesId: null,
            facilityId: "room-1",
            facilityName: "Gym",
            bookingType: "one_time",
            startAt: "2026-10-01T14:00:00.000Z",
            endAt: "2026-10-01T16:00:00.000Z",
            status: "confirmed",
            quotedAmount: "40.00",
            currency: "CAD",
          },
          seriesId: null,
          seriesTitle: null,
          occurrences: [],
        },
      ],
    });
  });

  it("reads a Series card's projected occurrence subset and page_size fallback", () => {
    const result = mapBrowsePage({
      page: 0,
      page_size: 20,
      total: 1,
      section: "past",
      items: [
        {
          kind: "series",
          is_booker: true,
          is_view_only: false,
          photo_urls: [],
          series_id: "series-1",
          series_title: "Weekly choir",
          occurrences: [
            {
              id: "occ-1",
              title: "Week 1",
              series_id: "series-1",
              facility_name: "Sanctuary",
              booking_type: "recurring",
              start_at: "2026-08-01T14:00:00.000Z",
              end_at: "2026-08-01T16:00:00.000Z",
              status: "confirmed",
            },
          ],
        },
      ],
    });

    expect(result.pageSize).toBe(20);
    expect(result.items[0].kind).toBe(MY_BOOKINGS_CARD_KIND.SERIES);
    expect(result.items[0].occurrences.map((item) => item.title)).toEqual(["Week 1"]);
    expect(result.items[0].booking).toBeNull();
  });

  it("defaults to an empty page when data is missing", () => {
    expect(mapBrowsePage(null)).toEqual({
      section: MY_BOOKINGS_SECTION.UPCOMING,
      page: 0,
      pageSize: 0,
      total: 0,
      items: [],
    });
  });

  it("maps a legacy titleless row to an empty string rather than substituting the room name", () => {
    const result = mapBrowsePage({
      page: 0,
      pageSize: 20,
      total: 1,
      section: "upcoming",
      items: [
        {
          kind: "one_time",
          isBooker: true,
          isViewOnly: false,
          photoUrls: [],
          booking: {
            id: "booking-1",
            facility_name: "Gym",
            booking_type: "one_time",
            start_at: "2026-10-01T14:00:00.000Z",
            end_at: "2026-10-01T16:00:00.000Z",
            status: "confirmed",
          },
        },
      ],
    });

    expect(result.items[0].booking?.title).toBe("");
    expect(result.items[0].booking?.facilityName).toBe("Gym");
  });
});

describe("browseCardKey", () => {
  it("keys a one-time card by its booking id", () => {
    const card: MyBookingsBrowseCard = {
      kind: MY_BOOKINGS_CARD_KIND.ONE_TIME,
      isBooker: true,
      isViewOnly: false,
      photoUrls: [],
      booking: {
        id: "booking-1",
        title: "",
        seriesId: null,
        facilityId: null,
        facilityName: null,
        bookingType: "one_time",
        startAt: "",
        endAt: "",
        status: "confirmed",
        quotedAmount: null,
        currency: null,
      },
      seriesId: null,
      seriesTitle: null,
      occurrences: [],
    };
    expect(browseCardKey(card)).toBe("one_time:booking-1");
  });

  it("keys a Series card by its series id, distinct from a one-time key sharing the same id", () => {
    const seriesCard: MyBookingsBrowseCard = {
      kind: MY_BOOKINGS_CARD_KIND.SERIES,
      isBooker: true,
      isViewOnly: false,
      photoUrls: [],
      booking: null,
      seriesId: "shared-id",
      seriesTitle: "Weekly choir",
      occurrences: [],
    };
    expect(browseCardKey(seriesCard)).toBe("series:shared-id");
    expect(browseCardKey(seriesCard)).not.toBe("one_time:shared-id");
  });
});

describe("browseCardPrimaryFacilityName", () => {
  it("uses the booking's room for a one-time card", () => {
    const card: MyBookingsBrowseCard = {
      kind: MY_BOOKINGS_CARD_KIND.ONE_TIME,
      isBooker: true,
      isViewOnly: false,
      photoUrls: [],
      booking: {
        id: "booking-1",
        title: "",
        seriesId: null,
        facilityId: "room-1",
        facilityName: "Gym",
        bookingType: "one_time",
        startAt: "",
        endAt: "",
        status: "confirmed",
        quotedAmount: null,
        currency: null,
      },
      seriesId: null,
      seriesTitle: null,
      occurrences: [],
    };
    expect(browseCardPrimaryFacilityName(card)).toBe("Gym");
  });

  it("uses the first projected occurrence's room for a Series card", () => {
    const card: MyBookingsBrowseCard = {
      kind: MY_BOOKINGS_CARD_KIND.SERIES,
      isBooker: true,
      isViewOnly: false,
      photoUrls: [],
      booking: null,
      seriesId: "series-1",
      seriesTitle: "Weekly choir",
      occurrences: [
        {
          id: "occ-1",
          title: "Week 1",
          seriesId: "series-1",
          facilityId: "room-2",
          facilityName: "Sanctuary",
          bookingType: "recurring",
          startAt: "2026-08-01T14:00:00.000Z",
          endAt: "2026-08-01T16:00:00.000Z",
          status: "confirmed",
          quotedAmount: null,
          currency: null,
        },
      ],
    };
    expect(browseCardPrimaryFacilityName(card)).toBe("Sanctuary");
  });

  it("returns null for a Series card with no projected occurrences", () => {
    const card: MyBookingsBrowseCard = {
      kind: MY_BOOKINGS_CARD_KIND.SERIES,
      isBooker: true,
      isViewOnly: false,
      photoUrls: [],
      booking: null,
      seriesId: "series-1",
      seriesTitle: "Weekly choir",
      occurrences: [],
    };
    expect(browseCardPrimaryFacilityName(card)).toBeNull();
  });
});

describe("canCancelOneTimeCard / canCancelSeriesCard", () => {
  const oneTimeCard = (
    overrides: Partial<{ isBooker: boolean; status: string; startAt: string }> = {}
  ): MyBookingsBrowseCard => ({
    kind: MY_BOOKINGS_CARD_KIND.ONE_TIME,
    isBooker: overrides.isBooker ?? true,
    isViewOnly: !(overrides.isBooker ?? true),
    photoUrls: [],
    booking: {
      id: "booking-1",
      title: "",
      seriesId: null,
      facilityId: null,
      facilityName: null,
      bookingType: "one_time",
      startAt: overrides.startAt ?? "2026-09-20T13:00:00.000Z",
      endAt: "2026-09-20T14:30:00.000Z",
      status: overrides.status ?? "confirmed",
      quotedAmount: null,
      currency: null,
    },
    seriesId: null,
    seriesTitle: null,
    occurrences: [],
  });

  it("lets the Booker cancel a live future one-time card", () => {
    expect(canCancelOneTimeCard(oneTimeCard(), now)).toBe(true);
  });

  it("never lets a view-only Ministry participant cancel a one-time card, even though it is still live and future", () => {
    expect(canCancelOneTimeCard(oneTimeCard({ isBooker: false }), now)).toBe(false);
  });

  it("does not let the Booker cancel a past one-time card", () => {
    expect(canCancelOneTimeCard(oneTimeCard({ startAt: "2026-08-01T13:00:00.000Z" }), now)).toBe(false);
  });

  it("does not let the Booker cancel an already-cancelled one-time card", () => {
    expect(canCancelOneTimeCard(oneTimeCard({ status: "cancelled" }), now)).toBe(false);
  });

  const seriesOccurrence = (startAt: string): MemberBookingListItem => ({
    id: "occ-1",
    title: "Week 1",
    seriesId: "series-1",
    facilityId: null,
    facilityName: null,
    bookingType: "recurring",
    startAt,
    endAt: "2026-09-24T14:30:00.000Z",
    status: "confirmed",
    quotedAmount: null,
    currency: null,
  });

  const seriesCard = (
    overrides: Partial<{ isBooker: boolean; occurrenceStartAt: string }> = {}
  ): MyBookingsBrowseCard => ({
    kind: MY_BOOKINGS_CARD_KIND.SERIES,
    isBooker: overrides.isBooker ?? true,
    isViewOnly: !(overrides.isBooker ?? true),
    photoUrls: [],
    booking: null,
    seriesId: "series-1",
    seriesTitle: "Weekly choir",
    occurrences: [seriesOccurrence(overrides.occurrenceStartAt ?? "2026-09-24T13:00:00.000Z")],
  });

  it("lets the Booker cancel a Series card with at least one live future occurrence", () => {
    expect(canCancelSeriesCard(seriesCard(), now)).toBe(true);
  });

  it("never lets a view-only Ministry participant cancel a Series card", () => {
    expect(canCancelSeriesCard(seriesCard({ isBooker: false }), now)).toBe(false);
  });

  it("does not let the Booker cancel a Series card whose only projected occurrences are past", () => {
    expect(canCancelSeriesCard(seriesCard({ occurrenceStartAt: "2026-08-01T13:00:00.000Z" }), now)).toBe(false);
  });
});

describe("applyBrowsePage / hasMoreBrowsePages", () => {
  const card = (id: string): MyBookingsBrowseCard => ({
    kind: MY_BOOKINGS_CARD_KIND.ONE_TIME,
    isBooker: true,
    isViewOnly: false,
    photoUrls: [],
    booking: {
      id,
      title: "",
      seriesId: null,
      facilityId: null,
      facilityName: null,
      bookingType: "one_time",
      startAt: "",
      endAt: "",
      status: "confirmed",
      quotedAmount: null,
      currency: null,
    },
    seriesId: null,
    seriesTitle: null,
    occurrences: [],
  });

  it("replaces items on page 0 (a fresh load or retry)", () => {
    const loaded = applyBrowsePage(
      { ...INITIAL_MY_BOOKINGS_SECTION_STATE, items: [card("stale")] },
      { section: MY_BOOKINGS_SECTION.UPCOMING, page: 0, pageSize: 2, total: 3, items: [card("a"), card("b")] }
    );
    expect(loaded.items.map((item) => item.booking?.id)).toEqual(["a", "b"]);
    expect(loaded.status).toBe("loaded");
  });

  it("appends items on a later page (Load more)", () => {
    const first = applyBrowsePage(INITIAL_MY_BOOKINGS_SECTION_STATE, {
      section: MY_BOOKINGS_SECTION.UPCOMING,
      page: 0,
      pageSize: 2,
      total: 3,
      items: [card("a"), card("b")],
    });
    const second = applyBrowsePage(first, {
      section: MY_BOOKINGS_SECTION.UPCOMING,
      page: 1,
      pageSize: 2,
      total: 3,
      items: [card("c")],
    });
    expect(second.items.map((item) => item.booking?.id)).toEqual(["a", "b", "c"]);
  });

  it("reports more pages while loaded items fall short of the total", () => {
    const first = applyBrowsePage(INITIAL_MY_BOOKINGS_SECTION_STATE, {
      section: MY_BOOKINGS_SECTION.UPCOMING,
      page: 0,
      pageSize: 2,
      total: 3,
      items: [card("a"), card("b")],
    });
    expect(hasMoreBrowsePages(first)).toBe(true);

    const second = applyBrowsePage(first, {
      section: MY_BOOKINGS_SECTION.UPCOMING,
      page: 1,
      pageSize: 2,
      total: 3,
      items: [card("c")],
    });
    expect(hasMoreBrowsePages(second)).toBe(false);
  });

  it("reports no more pages before any page has loaded", () => {
    expect(hasMoreBrowsePages(INITIAL_MY_BOOKINGS_SECTION_STATE)).toBe(false);
  });
});
