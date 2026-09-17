export interface UserBooking {
  id: string;
  roomName: string;
  date: string;
  startTime: string;
  endTime: string;
  note?: string;
}

export interface MemberBookingListItem {
  id: string;
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
