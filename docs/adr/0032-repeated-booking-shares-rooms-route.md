# 0032. Repeated Booking shares the Rooms route with One-time selection

## Status

Accepted

## Context

ADR 0030 deliberately sent Repeated Booking through a separate Start booking form and kept it out of the Timetable. That created a visibly separate room-selection experience: Repeated collected First occurrence, Last occurrence, shared time, and rooms in one form, while One-time continued to `/rooms`.

The member experience should instead have one booking journey. A member choosing Repeated still needs the same room discovery, filters, and availability surface as One-time, but a Recurring Booking Series has constraints that a One-time Booking cart does not: one weekly weekday, First occurrence and Last occurrence inside one Use Period, and one shared local time window for all rooms.

## Decision

- Repeated Booking continues to `/rooms` after the member supplies its shared Start Time and End Time. The route has an explicit Repeated mode; it is not an independent recurring occurrence form.
- Repeated mode reuses the room filters, room presentation, and initial-date availability surface from One-time. Its selected rooms all use the shared time window; members cannot assign separate room-line times, use the One-time Booking cart, or open Confirm Booking Time.
- A Recurring schedule card appears above room selection, expanded by default. It contains fixed `Every week` copy, a single weekday selector, `Starts on`, and `Ends on`. It shows the resulting weekly occurrence count.
- Repeated mode does not offer multiple weekdays, every-N-week cadence, monthly recurrence, Never, or After occurrence endings.
- The initial availability surface is anchored to First occurrence. Once a valid proposal has at least one selected room, the client debounces the existing full-series conflict preview and presents its current result. Review always precedes create, even when preview reports no conflicts.
- Preview remains non-reserving. On create, the client sends only previewed conflicting dates the Booker explicitly excludes; the server remains authoritative and revalidates the final proposal.
- The existing Recurring Booking Series APIs, payloads, payment-hold behavior, conflict semantics, and success outcome remain unchanged.

## Consequences

- This supersedes ADR 0030's decision that Repeated never reaches the Timetable / `/rooms` route.
- `/rooms` now has two intentional interaction modes: One-time uses per-line Timetable selection and a Booking cart; Repeated uses shared-time room selection plus the Recurring schedule card.
- The member may see immediate availability for First occurrence and the full-series conflict state without being misled that preview reserves any room.

## Related

- ADR 0030 (superseded in the stated area)
- `newlife-core-api` ADR 0019 (Recurring Booking Series)
- `newlife-core-api` ADR 0020 (Recurring Booking conflict preview)
