# One-time Override is acknowledged twice: before the Cart and at final confirmation

A One-time Priority Ministry proposal may now select Override time (ADR 0011 and ADR 0038 kept it display-only). Cells stay the authority: the Timetable admits Override cells only on a One-time Ministry proposal, and the whole selected interval must be Available or Override. Repeated proposals follow the same two stages; see ADR 0040.

Selecting Override has two acknowledgements. After Confirm Booking Time, an early popup confirms the actual interval before Cart admission; it has no notify wording and causes no request. On Booking Details, the Draft evaluation (`isConfirmable`, `conflicts`, `overrideImpacts`, `overrideReviewToken`) drives the page: impacts list every released room interval, and Confirm opens a final Confirm and notify popup. Only that action sends `overrideReviewToken` with the existing create request.

A review-required or stale error reloads the Draft and closes the popup, so the member must acknowledge the new impact. A scheduling conflict reloads the Draft and shows its blocking conflicts with only the contacts the server authorized. The page never retries the create on its own. The dialogs, impact list, and conflict list are separate components so the Repeated flow can reuse them.
