---
status: superseded by ADR-0024
---

# Space needed is single or multiple; Gym and Sanctuary are a room

Search from Start booking sends `space=single` or `space=multiple` only. Choosing Gym or Sanctuary still sends `space=single` plus `room` as that room's stable code (`gym`, `sanctuary-hall`), because the Rooms Search Bar can change filters later. Missing `date` on Rooms returns to Home, not Start booking.
