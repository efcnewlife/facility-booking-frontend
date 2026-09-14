# Booking Details follows the cart; back, thumbnails, and + Room

**Booking Details** opens from **Review Booking** on the Booking cart, not from ADD alone. A **back** control above the title returns to the Timetable with cart state preserved. There is **no single Time row** at the top; each Space row shows a **thumbnail**, that line’s interval, Edit, and Remove. **+ Room** below all Space rows returns to the Timetable to add more lines. The URL query remains a **draft** snapshot (reload refetches availability and quote); it is not a backend hold.

Updates ADR 0016 (draft query unchanged; cart is the Timetable-side selection model before Review Booking).

**Updated by ADR 0029**: Review Booking now creates a backend Booking Draft instead of encoding the cart into the query; back / + Room now round-trip cart state through that Draft and the Timetable’s localStorage (ADR 0028) rather than re-encoding the query directly.
