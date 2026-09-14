# Timetable cart persists via localStorage, not the URL

The Timetable's own Booking cart (before Review Booking) is kept in the browser's `localStorage`, keyed so it only restores when the stored date and ministry match the current search — a mismatch is treated as an empty cart. This closes the gap where adding a room and refreshing lost the cart: `handleConfirmBookingTime` updated React state but never wrote the line back anywhere durable. `sessionStorage` was considered and rejected: the member should not lose an in-progress cart just for switching tabs or closing the browser and coming back. The Pinned interval (selected but not yet confirmed) is intentionally excluded — it stays ephemeral and does not survive a refresh.

Supersedes the Timetable-side reading of ADR 0016 ("the query is a draft"): that reasoning still holds for Booking Details (see ADR 0029), but the Timetable page itself no longer reads or writes cart state through its URL at all.

## Consequences

- Multiple tabs on the same date/ministry share and can overwrite each other's localStorage cart; this is accepted, not solved, in this slice.
- Leaving Booking Details via back / + Room writes the (possibly edited) Booking Draft back into this same localStorage slot so the two stay consistent (see ADR 0029).
