import { saveTimetableCart, type CartStorage } from "./timetableCartStorage";

/**
 * Fire-and-forget cleanup run every time a member enters Start Booking: clears the
 * Timetable's persisted cart outright and asks the backend to bulk-delete all of the
 * member's unconfirmed Booking Drafts and Recurring Series Drafts. A failed bulk-delete
 * must not block entering the flow, and one failed cleanup must not skip the other.
 */
export const clearStartBookingState = async (
  storage: CartStorage,
  ...deleteDraftOperations: Array<() => Promise<void>>
): Promise<void> => {
  saveTimetableCart(storage, null);
  for (const deleteDrafts of deleteDraftOperations) {
    try {
      await deleteDrafts();
    } catch {
      // ignore: a transient failure here should not block Start Booking
    }
  }
};
