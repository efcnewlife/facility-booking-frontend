export const MY_BOOKINGS_SECTION = {
  UPCOMING: "upcoming",
  OVERRIDDEN: "overridden",
  PAST: "past",
  CANCELLED_OR_EXPIRED: "cancelled_or_expired",
} as const;

export type MyBookingsSection = (typeof MY_BOOKINGS_SECTION)[keyof typeof MY_BOOKINGS_SECTION];

export const MY_BOOKINGS_CARD_KIND = {
  ONE_TIME: "one_time",
  SERIES: "series",
} as const;

export type MyBookingsCardKind = (typeof MY_BOOKINGS_CARD_KIND)[keyof typeof MY_BOOKINGS_CARD_KIND];

export interface MemberBookingListItem {
  id: string;
  title: string;
  seriesId: string | null;
  facilityId: string | null;
  facilityName: string | null;
  bookingType: string;
  startAt: string;
  endAt: string;
  status: string;
  quotedAmount: string | number | null;
  currency: string | null;
}

export interface MyBookingsBrowseCard {
  kind: MyBookingsCardKind;
  isBooker: boolean;
  isViewOnly: boolean;
  photoUrls: string[];
  booking: MemberBookingListItem | null;
  seriesId: string | null;
  seriesTitle: string | null;
  occurrences: MemberBookingListItem[];
}

export interface MyBookingsBrowsePage {
  section: MyBookingsSection;
  page: number;
  pageSize: number;
  total: number;
  items: MyBookingsBrowseCard[];
}
