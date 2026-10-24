export type BookingConfirmationKind = "one-time" | "repeated";

/** Navigation state the saved-details page reads to acknowledge a just-confirmed free Ministry booking. */
export interface FreeMinistryConfirmationState {
  freeMinistryConfirmed: true;
}

export interface BookingConfirmationTarget {
  path: string;
  state: FreeMinistryConfirmationState | undefined;
}

/** A free Ministry Booking or Series never enters payment, so confirmation lands on its saved details. */
export const bookingConfirmationTarget = (
  kind: BookingConfirmationKind,
  id: string,
  isFreeMinistry: boolean
): BookingConfirmationTarget => {
  if (!isFreeMinistry) {
    return { path: `/payment/${kind}/${id}`, state: undefined };
  }
  return {
    path: kind === "one-time" ? `/my-bookings/${id}` : `/my-bookings/series/${id}`,
    state: { freeMinistryConfirmed: true },
  };
};

export const isFreeMinistryConfirmationState = (state: unknown): state is FreeMinistryConfirmationState => {
  return typeof state === "object" && state !== null && "freeMinistryConfirmed" in state;
};

interface SavedPricedRecord {
  ministryId: string | null;
  quotedAmount: string | number | null;
}

/**
 * Saved records carry no free flag; the server only creates a Ministry association through the
 * free-pricing gate, so a Ministry record with a zero snapshot total is a free Ministry booking.
 */
export const isSavedFreeMinistryBooking = (record: SavedPricedRecord): boolean => {
  if (!record.ministryId || record.quotedAmount == null || record.quotedAmount === "") {
    return false;
  }
  return Number(record.quotedAmount) === 0;
};
