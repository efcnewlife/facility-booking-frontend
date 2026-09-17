# My Bookings groups Recurring Booking Series and cancels by approved scopes

My Bookings is now a live member list. One-time Bookings remain individual cards. Materialized Recurring Booking occurrences are grouped under their Series (`seriesId` from `GET /api/v1/facility/bookings/mine`). Series detail is `GET /api/v1/facility/booking-series/{seriesId}` and cancellation is `POST .../cancel` with only `occurrence`, `this_and_future`, and `entire_series`.

Payment-hold expiry is not a client countdown. The page re-reads Series state on load and when the tab becomes visible, then compares `paymentHoldExpiresAt` to now so an elapsed Pending-payment hold can show as expired before the sweep rewrites rows.

Occurrence modification and refunds remain out of scope: the Change control is hidden.

## Consequences

- Member list grouping depends on `seriesId` on each Recurring occurrence. One-time rows keep `seriesId` null.
- Historical, cancelled, and overridden occurrences stay visible and are not offered as cancellation targets.

## Related

- facility-booking-frontend#99, core-api#139 / #152
- core-api ADR 0023 (cancellation scopes and Series read)
