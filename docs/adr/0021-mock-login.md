# Mock login for dev and staging QA without Microsoft

QA and developers need to sign in to Facility Booking without Microsoft Entra ID and without a password, while exercising **real** backend sessions (bookings, ministries, approvals). The old dev email sign-in created a frontend-only fake token that API calls rejected. **Mock login** replaces that path: `POST /api/v1/auth/mock-login` with `{ email }` returns the same member JWT shape as Microsoft login. Only **development and staging** may enable it; production must not. Testing accounts are identified by email suffix `@test.local` (configurable via `TESTING_ACCOUNT_EMAIL_SUFFIX`); no `is_testing_account` DB column. Accounts are provisioned by operator CLI only ([newlife-core-api#118](https://github.com/efcnewlife/newlife-core-api/issues/118)), not Admin UI or self-registration. Each testing account keeps its own ministry and booking relationships — mock login does not bypass business rules. Staging also requires a shared secret header (`X-Mock-Login-Secret`). Failed attempts return a generic `401` whether the suffix or account is wrong. `VITE_SKIP_AUTH` is removed; use mock login or Microsoft instead.

## Considered Options

- **Keep frontend-only dev login (`dev_token_local_login`)** — rejected: API calls 401; QA cannot test real flows.
- **`is_testing_account` boolean on `auth.user`** — rejected: suffix `@test.local` is enough, avoids migration and Admin checkbox; trade-off is testing accounts cannot use real-looking email domains.
- **`POST /api/v1/auth/login/testing`** — rejected: `/mock-login` matches product language and grilling consensus.
- **Superuser bypass for testing accounts** — rejected: staging QA must match production authorization rules per account.
- **Keep `VITE_SKIP_AUTH` alongside mock login** — rejected: two bypass paths confuse QA; mock login covers non-Microsoft testing with real tokens.
- **Mock login in production with IP allowlist** — rejected: dev/staging only.

## Consequences

- Frontend: replace `VITE_SHOW_DEV_LOGIN` / `loginAsDevUser` with `VITE_SHOW_MOCK_LOGIN` and `loginAsMockUser` calling the API; remove fake token helpers.
- Backend (separate implementation): `MOCK_LOGIN_ENABLED`, `MOCK_LOGIN_SECRET`, suffix validation, Origin binding via `MEMBER_WEB_APPS`, reuse `complete_member_login` — see [newlife-core-api ADR 0014](https://github.com/efcnewlife/newlife-core-api/blob/main/docs/adr/0014-mock-login-member-auth.md).
- `CONTEXT.md`: **Mock login** glossary; **Sign in** references mock login collapsible in non-production.
- QA docs: retire or rewrite TC-AUTH-011 (dev login) and TC-AUTH-012 (`VITE_SKIP_AUTH`); add mock-login cases for dev/staging.
- Persona seeding (owner vs steward vs non-ministry `@test.local` users) is out of scope for the mock-login mechanism — follow-up ticket.
