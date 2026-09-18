import {
  MY_BOOKINGS_CARD_KIND,
  MY_BOOKINGS_SECTION,
  type MemberBookingListItem,
  type MyBookingsBrowseCard,
  type MyBookingsBrowsePage,
  type MyBookingsCardKind,
  type MyBookingsSection,
} from "@/types/myBookings";

export const BOOKING_STATUS = {
  PENDING_PAYMENT: "pending_payment",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  OVERRIDDEN: "overridden",
} as const;

export const SERIES_DISPLAY_STATUS = {
  PENDING_PAYMENT: "pending_payment",
  CONFIRMED: "confirmed",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
} as const;

export const RECURRING_CANCELLATION_SCOPE = {
  OCCURRENCE: "occurrence",
  THIS_AND_FUTURE: "this_and_future",
  ENTIRE_SERIES: "entire_series",
} as const;

export type SeriesDisplayStatus = (typeof SERIES_DISPLAY_STATUS)[keyof typeof SERIES_DISPLAY_STATUS];
export type RecurringCancellationScope =
  (typeof RECURRING_CANCELLATION_SCOPE)[keyof typeof RECURRING_CANCELLATION_SCOPE];

export const APPROVED_CANCELLATION_SCOPES: RecurringCancellationScope[] = [
  RECURRING_CANCELLATION_SCOPE.OCCURRENCE,
  RECURRING_CANCELLATION_SCOPE.THIS_AND_FUTURE,
  RECURRING_CANCELLATION_SCOPE.ENTIRE_SERIES,
];

const LIVE_OCCURRENCE_STATUSES = new Set<string>([BOOKING_STATUS.PENDING_PAYMENT, BOOKING_STATUS.CONFIRMED]);

export interface CancellableOccurrence {
  id: string;
  startAt: string;
  status: string;
}

export interface RecurringSeriesHoldState {
  status: string;
  paymentHoldExpiresAt: string | null;
}

interface OccurrenceHoldState {
  status: string;
}

const RESOURCE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getBookingStatusBadgeColor = (status: string): "warning" | "success" | "error" | "info" | "light" => {
  switch (status) {
    case SERIES_DISPLAY_STATUS.PENDING_PAYMENT:
      return "warning";
    case SERIES_DISPLAY_STATUS.CONFIRMED:
      return "success";
    case SERIES_DISPLAY_STATUS.EXPIRED:
      return "error";
    case BOOKING_STATUS.OVERRIDDEN:
      return "info";
    case SERIES_DISPLAY_STATUS.CANCELLED:
    default:
      return "light";
  }
};

export const parseSeriesId = (value: string | undefined): string | null => {
  if (!value || !RESOURCE_UUID.test(value)) {
    return null;
  }
  return value;
};

export const isCancellableOccurrence = (occurrence: CancellableOccurrence, now: Date): boolean => {
  return LIVE_OCCURRENCE_STATUSES.has(occurrence.status) && new Date(occurrence.startAt) > now;
};

export const affectedOccurrencesForScope = <T extends CancellableOccurrence>(
  occurrences: T[],
  scope: RecurringCancellationScope,
  occurrenceId: string | null,
  now: Date
): T[] => {
  if (scope === RECURRING_CANCELLATION_SCOPE.OCCURRENCE) {
    const match = occurrences.find((item) => item.id === occurrenceId);
    return match && isCancellableOccurrence(match, now) ? [match] : [];
  }
  if (scope === RECURRING_CANCELLATION_SCOPE.THIS_AND_FUTURE) {
    const pivot = occurrences.find((item) => item.id === occurrenceId);
    if (!pivot) {
      return [];
    }
    return occurrences.filter((item) => item.startAt >= pivot.startAt && isCancellableOccurrence(item, now));
  }
  if (scope === RECURRING_CANCELLATION_SCOPE.ENTIRE_SERIES) {
    return occurrences.filter((item) => isCancellableOccurrence(item, now));
  }
  return [];
};

export const isPendingPaymentHoldExpired = (paymentHoldExpiresAt: string | null | undefined, now: Date): boolean => {
  if (!paymentHoldExpiresAt) {
    return false;
  }
  return new Date(paymentHoldExpiresAt) <= now;
};

export const resolveSeriesDisplayStatus = (
  series: RecurringSeriesHoldState,
  now: Date
): SeriesDisplayStatus | string => {
  if (
    series.status === BOOKING_STATUS.PENDING_PAYMENT &&
    isPendingPaymentHoldExpired(series.paymentHoldExpiresAt, now)
  ) {
    return SERIES_DISPLAY_STATUS.EXPIRED;
  }
  return series.status;
};

export const resolveOccurrenceDisplayStatus = (
  occurrence: OccurrenceHoldState,
  series: RecurringSeriesHoldState,
  now: Date
): string => {
  if (
    occurrence.status === BOOKING_STATUS.PENDING_PAYMENT &&
    isPendingPaymentHoldExpired(series.paymentHoldExpiresAt, now)
  ) {
    return SERIES_DISPLAY_STATUS.EXPIRED;
  }
  return occurrence.status;
};

/**
 * The browse endpoint classifies a Booking into `cancelled_or_expired` once its Pending-payment
 * hold has elapsed, but the row still carries the raw `pending_payment` status (no hold timestamp
 * is returned on this contract). Re-derive the expired label from section membership instead.
 */
export const displayStatusForBrowseItem = (status: string, section: MyBookingsSection): string => {
  if (section === MY_BOOKINGS_SECTION.CANCELLED_OR_EXPIRED && status === BOOKING_STATUS.PENDING_PAYMENT) {
    return SERIES_DISPLAY_STATUS.EXPIRED;
  }
  return status;
};

export interface MyBookingsSectionConfig {
  section: MyBookingsSection;
  titleKey: string;
  emptyKey: string;
  defaultExpanded: boolean;
}

export const MY_BOOKINGS_SECTIONS: MyBookingsSectionConfig[] = [
  {
    section: MY_BOOKINGS_SECTION.UPCOMING,
    titleKey: "myBookings.sections.upcoming",
    emptyKey: "myBookings.sections.upcomingEmpty",
    defaultExpanded: true,
  },
  {
    section: MY_BOOKINGS_SECTION.OVERRIDDEN,
    titleKey: "myBookings.sections.overridden",
    emptyKey: "myBookings.sections.overriddenEmpty",
    defaultExpanded: false,
  },
  {
    section: MY_BOOKINGS_SECTION.PAST,
    titleKey: "myBookings.sections.past",
    emptyKey: "myBookings.sections.pastEmpty",
    defaultExpanded: false,
  },
  {
    section: MY_BOOKINGS_SECTION.CANCELLED_OR_EXPIRED,
    titleKey: "myBookings.sections.cancelledOrExpired",
    emptyKey: "myBookings.sections.cancelledOrExpiredEmpty",
    defaultExpanded: false,
  },
];

interface ApiMemberBookingBrowseItem {
  id?: string;
  title?: string;
  seriesId?: string | null;
  series_id?: string | null;
  facilityId?: string | null;
  facility_id?: string | null;
  facilityName?: string | null;
  facility_name?: string | null;
  bookingType?: string;
  booking_type?: string;
  startAt?: string;
  start_at?: string;
  endAt?: string;
  end_at?: string;
  status?: string;
  quotedAmount?: string | number | null;
  quoted_amount?: string | number | null;
  currency?: string | null;
}

interface ApiMemberBookingBrowseCard {
  kind?: string;
  isBooker?: boolean;
  is_booker?: boolean;
  isViewOnly?: boolean;
  is_view_only?: boolean;
  photoUrls?: string[];
  photo_urls?: string[];
  booking?: ApiMemberBookingBrowseItem | null;
  seriesId?: string | null;
  series_id?: string | null;
  seriesTitle?: string | null;
  series_title?: string | null;
  occurrences?: ApiMemberBookingBrowseItem[];
}

export interface ApiMemberBookingBrowsePage {
  page?: number;
  pageSize?: number;
  page_size?: number;
  total?: number;
  section?: string;
  items?: ApiMemberBookingBrowseCard[];
}

const mapBrowseBookingItem = (data: ApiMemberBookingBrowseItem): MemberBookingListItem => ({
  id: String(data.id ?? ""),
  title: String(data.title ?? ""),
  seriesId: data.seriesId ?? data.series_id ?? null,
  facilityId: data.facilityId ?? data.facility_id ?? null,
  facilityName: data.facilityName ?? data.facility_name ?? null,
  bookingType: String(data.bookingType ?? data.booking_type ?? ""),
  startAt: String(data.startAt ?? data.start_at ?? ""),
  endAt: String(data.endAt ?? data.end_at ?? ""),
  status: String(data.status ?? ""),
  quotedAmount: data.quotedAmount ?? data.quoted_amount ?? null,
  currency: data.currency ?? null,
});

const mapBrowseCard = (data: ApiMemberBookingBrowseCard): MyBookingsBrowseCard => ({
  kind: (data.kind as MyBookingsCardKind) ?? MY_BOOKINGS_CARD_KIND.ONE_TIME,
  isBooker: Boolean(data.isBooker ?? data.is_booker),
  isViewOnly: Boolean(data.isViewOnly ?? data.is_view_only),
  photoUrls: data.photoUrls ?? data.photo_urls ?? [],
  booking: data.booking ? mapBrowseBookingItem(data.booking) : null,
  seriesId: data.seriesId ?? data.series_id ?? null,
  seriesTitle: data.seriesTitle ?? data.series_title ?? null,
  occurrences: (data.occurrences ?? []).map(mapBrowseBookingItem),
});

export const mapBrowsePage = (data: ApiMemberBookingBrowsePage | null | undefined): MyBookingsBrowsePage => ({
  section: (data?.section as MyBookingsSection) ?? MY_BOOKINGS_SECTION.UPCOMING,
  page: Number(data?.page ?? 0),
  pageSize: Number(data?.pageSize ?? data?.page_size ?? 0),
  total: Number(data?.total ?? 0),
  items: (data?.items ?? []).map(mapBrowseCard),
});

export const browseCardKey = (card: MyBookingsBrowseCard): string => {
  if (card.kind === MY_BOOKINGS_CARD_KIND.SERIES) {
    return `series:${card.seriesId ?? ""}`;
  }
  return `one_time:${card.booking?.id ?? ""}`;
};

/** Mirrors the backend's `card_primary_facility_id`: the first occurrence's room for a Series, else the booking's room. */
export const browseCardPrimaryFacilityName = (card: MyBookingsBrowseCard): string | null => {
  if (card.kind === MY_BOOKINGS_CARD_KIND.SERIES) {
    return card.occurrences[0]?.facilityName ?? null;
  }
  return card.booking?.facilityName ?? null;
};

/** Only the Booker may cancel a one-time card, and only while it still has a live, future booking. */
export const canCancelOneTimeCard = (card: MyBookingsBrowseCard, now: Date): boolean => {
  return (
    card.kind === MY_BOOKINGS_CARD_KIND.ONE_TIME &&
    card.isBooker &&
    card.booking != null &&
    isCancellableOccurrence(card.booking, now)
  );
};

/** Only the Booker may cancel a Series card, and only while it still has a live, future occurrence. */
export const canCancelSeriesCard = (card: MyBookingsBrowseCard, now: Date): boolean => {
  return (
    card.kind === MY_BOOKINGS_CARD_KIND.SERIES &&
    card.isBooker &&
    card.occurrences.some((occurrence) => isCancellableOccurrence(occurrence, now))
  );
};

export interface MyBookingsSectionState {
  status: "idle" | "loading" | "loaded" | "error";
  page: number;
  pageSize: number;
  total: number;
  items: MyBookingsBrowseCard[];
  error: string | null;
}

export const INITIAL_MY_BOOKINGS_SECTION_STATE: MyBookingsSectionState = {
  status: "idle",
  page: 0,
  pageSize: 20,
  total: 0,
  items: [],
  error: null,
};

/** Page 0 replaces the section's items (a fresh load / retry); later pages append (Load more). */
export const applyBrowsePage = (
  state: MyBookingsSectionState,
  pageResult: MyBookingsBrowsePage
): MyBookingsSectionState => ({
  status: "loaded",
  page: pageResult.page,
  pageSize: pageResult.pageSize || state.pageSize,
  total: pageResult.total,
  items: pageResult.page === 0 ? pageResult.items : [...state.items, ...pageResult.items],
  error: null,
});

export const hasMoreBrowsePages = (state: MyBookingsSectionState): boolean => {
  if (state.pageSize <= 0) {
    return false;
  }
  return (state.page + 1) * state.pageSize < state.total;
};
