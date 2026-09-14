---
status: updated by ADR-0027, superseded by ADR-0029
---

# Booking Details is a page; the query is a draft, not a lock

Booking Details is `/booking-details` with date, optional ministry, and one or more **Booking lines** in the query (each line: facility id, sequence, start, end on that date) so reload and a pasted URL can reopen the same draft. That snapshot is not a cart and not a hold: every visit refetches availability and the backend quote, and create booking is the reservation. A query is shareable and easy to tamper; sessionStorage would hide the draft from a pasted URL but would not stop two tabs. We accept the query and make the server the source of truth.

See ADR 0027 for how Review Booking from the Booking cart populates this draft and how back / + Room preserve Timetable cart state.

**Superseded by ADR 0029**: the query no longer carries the draft directly — it carries `?checkoutId=`, referencing a backend Booking Draft. The "not a lock, always re-validated" spirit here is unchanged; only the transport and the shareability trade-off changed (a Booking Draft is owner-scoped, not shareable). The Timetable page itself also used to read/write this same query codec for its own cart on `/rooms` (inconsistently — only on the Details→back leg, never on ADD, which was the bug that started this); ADR 0028 replaces that with localStorage instead.
