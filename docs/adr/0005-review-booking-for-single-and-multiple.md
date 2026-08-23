---
status: superseded by ADR-0015
---

# Single and Multiple both open Booking Details via Review Booking

The single-room Timetable mock has BOOK on an Available block and no Review Booking; the multiple-room mock uses Review Booking (n). We still send both Space needed modes through Review Booking so confirm is one path. BOOK selects a room on the Timetable; it does not submit the booking or open Booking Details.
