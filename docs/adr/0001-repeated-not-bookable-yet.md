# Repeated is shown in Start booking but cannot continue

**Superseded by ADR 0030**: Repeated is now bookable — it continues to its own recurring occurrence form and creates a Recurring Booking Series. This ADR's reasoning still holds for the Timetable itself, which remains one-time-only; see ADR 0030 for why Repeated does not reach the Timetable.

Start booking includes One-time vs Repeated to match the design, and member copy keeps **Repeated**. Member create and availability are still a single interval on a single date (`one_time` only); there is no series write path. Choosing Repeated shows that series booking is not available yet and does not Continue. We do not submit a One-time booking and call it Repeated.
