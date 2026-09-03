# When optional time with no defaults; When seed highlight on Timetable

Start booking **When** requires a date in the One-time window. Start and end remain **optional as a pair** (both empty or both set; half-filled is invalid). The UI **does not prefill** default start or end. When both are set, entering the Timetable paints **When seed highlight** on every room that can cover that interval; that highlight is not a Booking line and does not enter the cart. If When times are empty, no seed highlight is shown. When times are not shown on the Search Bar.

Updates ADR 0006 (optional pair unchanged; adds no defaults and seed highlight semantics).

## Consequences

- Clicking one room sets **Pinned interval** for that column only; other rooms **keep** When seed highlight when present (ADR 0023).
