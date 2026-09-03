# Booking cart with per-room lines on one One-time booking

Member One-time booking uses a **Booking cart** on the Timetable: up to three **Booking lines**, each with its own room and start–end on the **same calendar day** as every other line in that booking (no cross-day multi-room booking; no line crosses midnight). The same room may appear on more than one line at different times that day. **Review Booking** on the cart opens Booking Details; there is no Single/Multiple split and no shared Booking interval across lines.

Supersedes ADR 0007. ADR 0005 and ADR 0015 are further superseded by ADR 0023.

## Consequences

- **newlife-core-api:** Drop or replace `uq_booking_room_booking_facility` so one booking may have multiple `booking_room` rows for the same `facility_id`. Member `preview-quote` must accept per-line `billed_hours` (ADR 0022 scope assumes Q26: quote after each line is confirmed).
- **Cart line UI:** Thumbnail, room name, interval, line subtotal, Edit, Remove (see CONTEXT.md **Booking cart**).
