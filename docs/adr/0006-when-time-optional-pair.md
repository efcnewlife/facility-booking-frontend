---
status: updated by ADR-0025
---

# When start and end are optional, but only as a pair

Start booking When requires a date in the One-time window. Start and end may both be empty so the member can pick a Booking interval on the Timetable. If either bound is present, both must be present. We do not treat a half-filled When as valid, and we do not keep the old rule that Search requires a complete time.
