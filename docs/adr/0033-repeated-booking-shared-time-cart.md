# 0033. Repeated Booking locks a shared time through the Timetable cart

## Status

Accepted

## Context

ADR 0032 moved Repeated Booking to the shared `/rooms` route but deliberately kept it out of the One-time Booking cart. That still leaves Repeated members with a different room-selection interaction and requires them to provide a shared Start Time and End Time before exploring rooms.

A Recurring Booking Series still has exactly one weekly weekday and one shared local time window for all rooms. The member should nevertheless be able to explore the Timetable like One-time Booking, select a room interval, and understand when selecting another interval would change the whole Series.

## Decision

- Repeated Start booking collects First occurrence / weekday plus optional Start Time and End Time. These times are seed-only search input, not a Series commitment. Selecting First occurrence derives the weekday. Selecting weekday first requires the member to choose a matching First occurrence.
- Repeated mode uses the Timetable and Booking cart interaction. The first interval confirmed into its cart becomes the Series shared time window.
- Every later Repeated room selection must use that exact shared interval. Selecting a different interval opens a confirmation dialog. Confirming replacement clears every room in the Repeated cart and all preview state, then makes the new interval the shared time window.
- The Repeated cart reuses the One-time cart's visual structure but represents selected rooms, not independently timed Booking lines. It shows the shared time and Remove for each room, does not show per-room subtotals, and leaves the server-computed Series payment total to Review.
- The Recurring schedule card on `/rooms` collects Last occurrence. The complete proposal still requires First occurrence, Last occurrence, weekday, shared time, and at least one room before preview and Review.

## Consequences

- This supersedes ADR 0032 where it requires shared times before `/rooms` and prohibits the One-time Booking cart / Confirm Booking Time interaction for Repeated mode.
- Repeated and One-time share room-discovery interaction while preserving their different aggregate contracts: Repeated room choices are cleared together on a time change; One-time Booking lines remain independently editable.
- The implementation needs an explicit, testable distinction between a One-time cart and a Repeated cart so one mode cannot leak invalid per-room times into the other.

## Related

- ADR 0032 (superseded in the stated area)
- `newlife-core-api` ADR 0019 (Recurring Booking Series)
- `newlife-core-api` ADR 0020 (Recurring Booking conflict preview)
