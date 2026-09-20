# Ministry Profile has a dedicated member read contract

Ministry Profile is a read-only representation of a Ministry across active, pending, and rejected lifecycle states. It uses `/my-ministry/:ministryId` and a dedicated member API contract, separately authorized for the applicant, Ministry member, or current Owner-position incumbent; it does not reuse the approval resource because approval is a distinct decision flow. The contract returns only the localized Profile projection, lifecycle information, stewardship, and live Owner Position/contact, so a vacancy has no incumbent contact and no former person is shown. An Active Ministry Profile hands off to the normal Start booking Ministry selection step with that Ministry preselected and its ID plus `source=my-ministry` retained in the URL. The page resolves the ID against the current user's active bookable list: a valid selection retains its source and shows the non-blocking automatic-selection banner, while an unavailable selection removes both values without a banner. Normal booking authorization and active-status validation still apply.

## Considered Options

- **Reuse `/approvals/{ministryId}`** — rejected: it names an approval resource even when the Ministry is Active or Rejected, and would couple Profile to a decision flow.
- **Compose Profile in the browser from Ministry, position, and user endpoints** — rejected: it would scatter authorization and make the Owner contact inconsistent with the current server state.
