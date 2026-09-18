---
status: accepted
---

# Repeated Booking Details uses a Recurring Series Draft

Repeated Booking and One-time Booking both enter typed `/booking-details` routes through Review Booking, but each keeps an aggregate-specific draft: a Booking Draft for one-time lines and a Recurring Series Draft for the weekly proposal. The Series is created only by Confirm on Booking Details, after the persisted proposal is reloaded and revalidated; this gives both flows the same review, back-navigation, refresh, and confirmation contract without forcing a weekly Series into the One-time draft model. Re-entering Start booking deletes both kinds of draft. A Repeated Booking Details view permits Title entry but not schedule or room editing: those changes return to Timetable and require a fresh preview, because the weekly proposal has one shared time and its conflict result is proposal-specific. A stale preview disables Confirm and returns the member to Timetable. Both successful creates use typed routes into the shared Payment experience, which reads the matching Booking or Series total rather than treating an occurrence as the Series. This supersedes ADR 0030's direct Series creation from Start booking or an in-place review surface.
