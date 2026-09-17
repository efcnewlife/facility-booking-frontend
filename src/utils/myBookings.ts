import type { MemberBookingListItem } from "@/types/myBookings";

export interface ApiMemberBookingListItem {
  id?: string;
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

export interface ApiMemberBookingList {
  items?: ApiMemberBookingListItem[];
}

export const BOOKING_TYPE = {
  ONE_TIME: "one_time",
  RECURRING: "recurring",
} as const;

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

export interface MyBookingsOneTimeEntry {
  kind: "one_time";
  booking: MemberBookingListItem;
}

export interface MyBookingsSeriesEntry {
  kind: "series";
  seriesId: string;
  occurrences: MemberBookingListItem[];
}

export type MyBookingsEntry = MyBookingsOneTimeEntry | MyBookingsSeriesEntry;

export interface GroupedMyBookings {
  upcoming: MyBookingsEntry[];
  past: MyBookingsEntry[];
}

export interface RecurringSeriesHoldState {
  status: string;
  paymentHoldExpiresAt: string | null;
}

interface OccurrenceHoldState {
  status: string;
}

const RESOURCE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const uniqueFacilityNames = (occurrences: Array<{ facilityName: string | null }>): string => {
  return Array.from(
    new Set(occurrences.map((item) => item.facilityName).filter((name): name is string => Boolean(name)))
  ).join(", ");
};

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

export const mapMemberBookingListItem = (data: ApiMemberBookingListItem): MemberBookingListItem => ({
  id: String(data.id ?? ""),
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

export const mapMemberBookingList = (data: ApiMemberBookingList | null | undefined): MemberBookingListItem[] => {
  return (data?.items ?? []).map(mapMemberBookingListItem);
};

const isUpcomingStart = (startAt: string, now: Date): boolean => new Date(startAt) > now;

const upcomingSortKey = (entry: MyBookingsEntry, now: Date): string => {
  if (entry.kind === "one_time") {
    return entry.booking.startAt;
  }
  const future = entry.occurrences.find((occurrence) => isUpcomingStart(occurrence.startAt, now));
  return future?.startAt ?? entry.occurrences[0]?.startAt ?? "";
};

const pastSortKey = (entry: MyBookingsEntry): string => {
  if (entry.kind === "one_time") {
    return entry.booking.startAt;
  }
  return entry.occurrences[entry.occurrences.length - 1]?.startAt ?? "";
};

export const groupMyBookings = (items: MemberBookingListItem[], now: Date): GroupedMyBookings => {
  const seriesById = new Map<string, MemberBookingListItem[]>();
  const ungrouped: MemberBookingListItem[] = [];

  for (const item of items) {
    if (item.bookingType === BOOKING_TYPE.RECURRING && item.seriesId) {
      const grouped = seriesById.get(item.seriesId) ?? [];
      grouped.push(item);
      seriesById.set(item.seriesId, grouped);
    } else {
      ungrouped.push(item);
    }
  }

  const seriesEntries: MyBookingsSeriesEntry[] = Array.from(seriesById.entries()).map(([seriesId, occurrences]) => ({
    kind: "series",
    seriesId,
    occurrences: [...occurrences].sort((left, right) => left.startAt.localeCompare(right.startAt)),
  }));

  const upcoming: MyBookingsEntry[] = [];
  const past: MyBookingsEntry[] = [];

  for (const item of ungrouped) {
    const entry: MyBookingsOneTimeEntry = { kind: "one_time", booking: item };
    if (isUpcomingStart(item.startAt, now)) {
      upcoming.push(entry);
    } else {
      past.push(entry);
    }
  }

  for (const entry of seriesEntries) {
    if (entry.occurrences.some((occurrence) => isUpcomingStart(occurrence.startAt, now))) {
      upcoming.push(entry);
    } else {
      past.push(entry);
    }
  }

  upcoming.sort((left, right) => upcomingSortKey(left, now).localeCompare(upcomingSortKey(right, now)));
  past.sort((left, right) => pastSortKey(right).localeCompare(pastSortKey(left)));

  return { upcoming, past };
};

export const isCancellableOccurrence = (occurrence: CancellableOccurrence, now: Date): boolean => {
  return LIVE_OCCURRENCE_STATUSES.has(occurrence.status) && isUpcomingStart(occurrence.startAt, now);
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
