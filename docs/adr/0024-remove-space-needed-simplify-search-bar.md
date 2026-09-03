# Remove Space needed; simplify Search Bar

Start booking no longer asks **Space needed**; Gym and Sanctuary are found on the Timetable like any other room (no `space` or `room` shortcut on Search). The Timetable **Search Bar** shows Ministry (when applicable), Repetition, and Date only—one control size step larger than before—with **Update search**. It does not show start time, end time, or room count. Typed bar changes apply on Update search; the Booking cart is the source of selected lines, not Search Bar time fields.

Supersedes ADR 0003. Replaces the selection-clearing rules in ADR 0013 for Time and space fields that no longer exist. **Update search** on **date** or **ministry** change clears the **Booking cart** so a new day cannot keep the previous day's lines.
