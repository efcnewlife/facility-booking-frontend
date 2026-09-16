import { saveTimetableCart, type CartStorage } from "./timetableCartStorage";

/**
 * Fire-and-forget cleanup run every time a member enters Start Booking: clears the
 * Timetable's persisted cart outright and asks the backend to bulk-delete all of the
 * member's Booking Drafts. A failed bulk-delete must not block entering the flow.
 */
export const clearStartBookingState = async (
  storage: CartStorage,
  deleteAllDrafts: () => Promise<void>
): Promise<void> => {
  saveTimetableCart(storage, null);
  try {
    await deleteAllDrafts();
  } catch {
    // ignore: a transient failure here should not block Start Booking
  }
};
