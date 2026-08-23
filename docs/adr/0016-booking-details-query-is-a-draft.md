# Booking Details is a page; the query is a draft, not a lock

Booking Details is `/booking-details` with date, interval, rooms, and ministry in the query so reload and a pasted URL can reopen the same draft. That snapshot is not a cart and not a hold: every visit refetches availability and the backend quote, and create booking is the reservation. A query is shareable and easy to tamper; sessionStorage would hide the draft from a pasted URL but would not stop two tabs. We accept the query and make the server the source of truth.
