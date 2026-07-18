import type { UserBooking } from "@/types/myBookings";

export const MOCK_UPCOMING_BOOKINGS: UserBooking[] = [
  {
    id: "booking-upcoming-1",
    roomName: "Sanctuary",
    date: "2026-03-05",
    startTime: "09:00",
    endTime: "10:30",
    note: "We'll need support for AV",
  },
];

export const MOCK_PAST_BOOKINGS: UserBooking[] = [
  {
    id: "booking-past-1",
    roomName: "Gym",
    date: "2026-01-10",
    startTime: "11:00",
    endTime: "13:30",
  },
  {
    id: "booking-past-2",
    roomName: "Meeting Room XXX",
    date: "2025-11-14",
    startTime: "19:00",
    endTime: "22:00",
  },
];
