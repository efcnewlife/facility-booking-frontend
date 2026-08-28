# My Ministry tabs unify applications and incumbent approval queue

**My Ministry** is the single member surface for Ministry Application lifecycle: tab **My applications** (pending, rejected, active, resubmit) and tab **Pending my approval** (incumbent queue + detail). There is no separate top-level Approvals nav item.

Incumbent notification emails deep-link to `/my-ministry/approvals/{ministryId}` after Microsoft sign-in. Post-login return uses an allowlisted `next` query (extends issue #39) so unauthenticated incumbents land on the detail page, not Home.

Create Ministry collects ministry type, optional target audiences, and at least one secondary steward via member user search; schedule is not collected on booking create.

## Considered Options

- **Dedicated Approvals nav item when count > 0** — rejected: fragments My Ministry; CONTEXT treats approval queue as a tab.
- **Portal-only incumbent approval** — rejected: product wants booking SPA decision UI and email entry point.
- **Separate pending-only wizard step after create** — rejected: superseded by My Ministry + modal confirmation; QA wizard docs drift from modal flow.

## Consequences

- Routes under `/my-ministry` and `/my-ministry/approvals/:id`; TopNav keeps existing My Ministry entry (`ministryOnly` visibility unchanged in spirit).
- Depends on core-api member approval APIs and Graph mail (ADR 0012 in `newlife-core-api`).
- Depends on post-login `next` allowlist for approval paths (#39).
- Expands scope of issue #2 beyond list-only stub.
