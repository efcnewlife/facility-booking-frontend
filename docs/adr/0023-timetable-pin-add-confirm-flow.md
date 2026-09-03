# Timetable: hover preview, pin, ADD, then Confirm Booking Time

On the Timetable, **hover** (or first tap on touch) previews Template duration on **one room column only**. **Click** sets that room’s **Pinned interval** only; it does not add to the cart or open a modal. **ADD** on the Available block opens **Confirm Booking Time**; on confirm the **Booking line** joins the cart and the control becomes a non-clickable checkmark until the line is removed from the cart. **BOOK** is retired. Edit on a cart line reopens the same modal.

Supersedes ADR 0015 and ADR 0018.

## Consequences

- Grid click must not jump straight to Confirm Booking Time (prior Single BOOK behavior).
- Remove from cart restores **ADD** on that block (checkmark is not an edit target).
