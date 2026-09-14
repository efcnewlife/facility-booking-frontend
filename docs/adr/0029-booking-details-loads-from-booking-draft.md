# Booking Details loads from a Booking Draft id, not a query-encoded snapshot

Booking Details keeps its name and route (`/booking-details`), but the query now carries only `?checkoutId=`, referencing a backend **Booking Draft** (ADR 0018 in newlife-core-api) instead of encoding date, ministry, and every Booking line directly in the URL. Review Booking creates the Draft from the current Timetable cart; Edit and Remove on this page PATCH that same Draft in place, so the URL never changes mid-edit. Only the member who created a Draft can open it — someone else's link, or a link to a Draft already consumed by Confirm, shows the existing Not Found page rather than a new error state. The Draft still never locks the room and is still re-validated (availability and Payment Summary) on every load, so the "not a backend lock" spirit of ADR 0016 is unchanged — only the transport changed, from a tamperable, shareable query to an owner-scoped id.

Updates ADR 0016 (query-as-draft is now backend-id-as-draft for Booking Details specifically; Timetable's own cart uses ADR 0028 instead) and ADR 0027 (back / + Room now round-trip through the Draft and localStorage rather than re-encoding the query).

## Consequences

- Booking Draft links are no longer shareable between members — a deliberate trade-off against ADR 0016's original "a query is shareable" reasoning, accepted because a Draft is a personal in-progress cart, not something worth sharing before Confirm.
- The Booking line cap the Timetable enforces client-side is no longer a fixed 3; it reads the live value carried on the availability response (see ADR 0018).
