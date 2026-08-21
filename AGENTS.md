# AGENTS.md — AI Entry Guide for facility-booking-frontend

This document helps AI agents quickly understand the **Facility Booking** member SPA: architecture, conventions, and where to make changes. There is no README in this repo yet; setup notes live here. Coding conventions are inferred from the codebase (this repo has no `.cursor/rules/`).

---

## 1. What This Project Is

| Item                | Value                                                                              |
| ------------------- | ---------------------------------------------------------------------------------- |
| **Purpose**         | Member-facing SPA for church facility (room) booking                               |
| **Package**         | `facility-booking-frontend` `0.1.0` (`private`)                                    |
| **Framework**       | React 19 + Vite 6 + TypeScript                                                     |
| **Styling**         | Tailwind CSS v4 (CSS-first `@theme` in `src/index.css`); host owns tokens          |
| **UI lib**          | `@efcnewlife/newlife-ui` (GitHub Packages)                                         |
| **Router**          | React Router v7 (`react-router`) — routes centralized in `src/routes/index.tsx`    |
| **HTTP**            | Axios via `httpClient`; app API prefix `/api/v1`                                   |
| **Auth**            | Microsoft Entra ID (MSAL popup) → backend token exchange; optional dev email login |
| **i18n**            | `i18next` + `react-i18next` (`en`, `zh-TW`, `zh-CN`)                               |
| **Dates**           | `moment` (API dates are `YYYY-MM-DD` strings)                                      |
| **Package manager** | pnpm only (`.npmrc`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`)                      |
| **Tests**           | Vitest (Node). `pnpm test` for `src/**/*.test.ts`; also `pnpm type-check`          |
| **CI**              | `.github/workflows/branch-name.yml` (PR head branch name)                          |

`flatpickr`, `moment-timezone`, and `react-helmet-async` are listed in `package.json` but **unused in `src/`**. Do not assume they are part of the stack. `BookingDatePicker` is a custom moment calendar.

### Related repositories

| Repo                      | Role                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------ |
| `newlife-core-api`        | Backend; this app consumes `/api/v1/*` (member/app surface, **not** `/admin/api/v1`) |
| `newlife-ui`              | Shared React component library + M3 theme CSS                                        |
| `newlife-portal-frontend` | Admin SPA (sibling consumer of core-api + newlife-ui)                                |
| `newlife-docs`            | Product / process documentation                                                      |

Local HTML design mocks live under `docs/design/` (not runtime).

---

## 2. Quick Commands

```bash
pnpm install          # requires NODE_AUTH_TOKEN (GitHub Packages)
./scripts/install-git-hooks.sh   # once per clone
pnpm dev              # http://localhost:5174 (strictPort — fails if taken)
pnpm type-check       # tsc -b --noEmit
pnpm test             # vitest run
pnpm lint             # eslint .
pnpm build            # tsc -b && vite build
pnpm build:stg        # --mode staging
pnpm build:prod       # --mode production
pnpm preview
./scripts/check-branch-name.test.sh
```

### Branch names

Topic branches: `{type}/{issue-number}-{short-description}` (types: `feat` `fix` `hotfix` `refactor` `perf` `test` `docs` `chore` `build` `ci`). Exceptions: `release/x.y.z`, `spike/{short-description}`, plus `main` / `develop`. Enforced by `.githooks/pre-push` (after install) and `.github/workflows/branch-name.yml`. Emergency: `git push --no-verify`. Consider marking the `Branch name` check required in GitHub branch protection.

Copy `.env.example` → `.env` (or `.env.local`) before running. Copy `.envrc.example` → `.envrc` (direnv) or export `NODE_AUTH_TOKEN` so pnpm can install `@efcnewlife/newlife-ui`.

If `pnpm install` 401s, the GitHub Packages token is missing.

Path alias `@` → `./src` is declared in both `vite.config.ts` and `tsconfig.app.json` — keep them in sync.

---

## 3. Repository Layout

```
/
├── src/
│   ├── main.tsx, App.tsx, index.css
│   ├── api/
│   │   ├── config/index.ts          # API_ENDPOINTS (prefix /api/v1)
│   │   └── services/                # httpClient, auth, facility, ministry
│   ├── auth/msalInstance.ts
│   ├── config/env.ts                # only place that reads import.meta.env
│   ├── context/AuthContext.tsx
│   ├── routes/index.tsx             # all routes
│   ├── layout/                      # AppLayout, TopNavBar, SupportFooter
│   ├── pages/
│   │   ├── login/
│   │   ├── home/                    # authenticated welcome
│   │   ├── start-booking/           # Start booking questions
│   │   ├── rooms/                   # availability results
│   │   ├── my-bookings/             # still mock-backed
│   │   ├── my-profile/              # partial mock
│   │   └── contact/                 # stub
│   ├── components/{auth,booking,profile}/
│   ├── data/                        # mockBookings, mockProfile, mockRooms, …
│   ├── i18n/                        # init + locales/{en,zh-TW,zh-CN}/
│   ├── types/
│   └── utils/                       # caseConvert, startBookingFlow, roomAvailabilityFilter, …
├── docs/design/                     # HTML/CSS mocks + assets (not runtime)
├── public/
└── AGENTS.md
```

---

## 4. App Entry & Routing

```
main.tsx → StrictMode → App (+ i18n, index.css)
App → AuthProvider → RouterProvider (router from src/routes/index.tsx)
```

Routes are **centralized** in `src/routes/index.tsx` (unlike the portal's module registry). Do not invent a backend-driven menu system here.

| Path             | Page               | Auth                    |
| ---------------- | ------------------ | ----------------------- |
| `/`              | `HomePage`         | Protected + `AppLayout` |
| `/start-booking` | `StartBookingPage` | Protected + `AppLayout` |
| `/rooms`         | `RoomFilterPage`   | Protected + `AppLayout` |
| `/my-bookings`   | `MyBookingsPage`   | Protected + `AppLayout` |
| `/my-profile`    | `MyProfilePage`    | Protected + `AppLayout` |
| `/contact`       | `ContactPage`      | Protected + `AppLayout` |
| `/login`         | `LoginPage`        | Public                  |
| `*`              | `Navigate` → `/`   | —                       |

`ProtectedRoute` (`src/components/auth/ProtectedRoute.tsx`): wait for auth loading → if not authenticated, redirect to `/login` → else `<Outlet />`.

**Nav** (`TopNavBar`): Book Now `/start-booking`, My Bookings `/my-bookings`, Contact `/contact`; logo → Home `/`; profile menu → `/my-profile` + logout. `/rooms` is not in the top nav (reached from Start booking Search).

---

## 5. Auth

| File                              | Role                                                                        |
| --------------------------------- | --------------------------------------------------------------------------- |
| `src/context/AuthContext.tsx`     | `AuthProvider`, `useAuth`; `loginWithMicrosoft`, `loginAsDevUser`, `logout` |
| `src/auth/msalInstance.ts`        | `PublicClientApplication`, `ensureMsalReady`                                |
| `src/api/services/authService.ts` | Token exchange, storage, profile, logout, dev login                         |
| `src/pages/login/LoginPage.tsx`   | Sign-in UI                                                                  |

### Flow

MSAL `loginPopup` → Entra `idToken` → `POST /api/v1/auth/login/microsoft` → app access + refresh tokens.

### Storage

Keys: `auth_token`, `refresh_token`, `refresh_token_expiry`, `user_data`, `remember_me`.

| Remember me | Where                                                       |
| ----------- | ----------------------------------------------------------- |
| Yes         | `localStorage` (refresh token stored with a 30-day expiry)  |
| No          | `sessionStorage` (access + user only; **no refresh token**) |

`clearOppositeStorage` keeps the two stores from drifting. Token read order: `sessionStorage` then `localStorage`.

### Dev flags (gated on `IS_DEV` in `src/config/env.ts`)

| Flag                                                                           | Behavior                                                                                                        |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `VITE_SHOW_DEV_LOGIN` → `IS_SHOW_DEV_LOGIN`                                    | Email-only sign-in form; `loginAsDevUser` — **no API**                                                          |
| `VITE_DEV_LOGIN_EMAIL`                                                         | Default email (`dev@local.test`)                                                                                |
| `VITE_SKIP_AUTH` → `IS_SKIP_AUTH`                                              | Placeholder token (`dev_token_skip_auth_mode`); context still needs stored `user_data` for a successful session |
| `VITE_AZURE_CLIENT_ID` + `VITE_AZURE_TENANT_ID` → `IS_MICROSOFT_LOGIN_ENABLED` | Microsoft button                                                                                                |

Read env through `ENV_CONFIG` / `IS_*` in `src/config/env.ts`, never `import.meta.env` in business code.

---

## 6. API Layer

A single `HttpClient` singleton (`src/api/services/httpClient.ts`) is the only network client. Do not reimplement interceptors per service.

### `httpClient` behaviors

- **Outgoing** bodies and params: `deepKeysToSnakeCase` (`src/utils/caseConvert.ts`). Write TS-idiomatic camelCase payloads; the backend request contract is snake_case.
- **Responses** are **not** auto-converted. Service mappers handle both shapes where the API is inconsistent (`ministryService.listLocales` normalizes locale codes).
- **Auth header:** Bearer from sessionStorage then localStorage.
- **401 refresh:** one de-duplicated promise; skips refresh/login URLs; writes refreshed tokens to **localStorage only**.
- **Retry:** network / timeout / 5xx up to `REQUEST_CONFIG.RETRY_ATTEMPTS` (3).
- **Errors:** `ApiError { code, message, details }`; i18n `errors:*`; backend `detail` preferred.
- **Accept-Language** from the current i18n language.

### Prefix and endpoints

All paths live in `src/api/config/index.ts` under `API_ENDPOINTS` (`BOOKING_API_PREFIX = "/api/v1"`). Add new routes there — do not inline URL strings.

| Group    | Paths in use                                                         |
| -------- | -------------------------------------------------------------------- |
| Auth     | `/auth/login/microsoft`, `/auth/logout`, `/auth/refresh`, `/auth/me` |
| Ministry | `/ministry/ministries/mine`, `/ministry/applications`                |
| Org      | `/org/positions/assignable`, `/org/locales`                          |
| Facility | `/facility/rooms/availability`, `/facility/bookings`                 |

Defined but unused by UI today: `MINISTRY.MINISTRY_TYPES`, `MINISTRY.TARGET_AUDIENCES`, `FACILITY.MY_BOOKINGS` (service method exists), `FACILITY.cancelBooking`.

### Services (only three)

| Service           | Owns                                                                       |
| ----------------- | -------------------------------------------------------------------------- |
| `authService`     | Login, logout, me, storage, dev login                                      |
| `ministryService` | `listMine`, `listAssignablePositions`, `listLocales`, `createApplication` |
| `facilityService` | `getAvailability`, `createBooking`, `listMyBookings` (latter unused by UI) |

Pages should call services, not `httpClient`.

### Still mock / unfinished

When wiring a real endpoint, **replace the mock import** rather than layering on top of it.

| Area                               | Source                                                                | Notes                                                   |
| ---------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------- |
| My Bookings                        | `src/data/mockBookings.ts`                                            | Change/cancel is `console.info` only                    |
| Profile extras                     | `src/data/mockProfile.ts`                                             | Mixes real user email/name with mock DOB/phone/payments |
| Contact                            | `ContactPage.tsx`                                                     | Stub heading                                            |
| Room gallery                       | `facilityService.mapAvailability` sets `galleryImages: []`            | Placeholder in `RoomResultCard`                         |
| Helpers still used from mock utils | `format_capacity_range`, `format_time_slot` in `utils/bookingMock.ts` | RoomFilter uses the live availability API               |

Orphan booking components (no page imports found): `BookingModeTabs`, `RoomGridCard`, `RoomSelectionBar`, `RoomGalleryModal`. Mention them; do not delete unless asked.

---

## 7. Booking Flow

Home → Start booking questions → Rooms.

### 1. Home — `src/pages/home/HomePage.tsx`

Authenticated welcome plus a Start Booking action. No question stepper.

### 2. Start booking — `src/pages/start-booking/StartBookingPage.tsx`

Driven by `?step=` (and `ministry=1|0` after Q1). Step transitions, When validation, and Rooms query building live in `src/utils/startBookingFlow.ts`:

```ts
type StartBookingStep =
  | "ministry_choice"
  | "select_ministry"
  | "frequency"
  | "when"
  | "space_needed";
```

Typical progression: ministry yes/no → (ministry name if Yes) → One-time vs Repeated → date and time → Space needed → navigate to `/rooms?...`. Create ministry is a modal on ministry name. The current step is mirrored into the URL with `{ replace: true }`.

### 3. Results — `src/pages/rooms/RoomFilterPage.tsx`

Reads Start booking output via `parseRoomsSearchQuery`. Missing or invalid `date` redirects to Home. Query: `date`, `start`, `end`, `space=single|multiple`, optional `ministryId`, optional `room` (`gym` / `sanctuary-hall`). Extra keys may be ignored until the timetable slice. Loads via `facilityService.getAvailability(date, ministryId)`, then client-filters. Can create a booking (max 3 rooms). Booking datetimes are `moment(...).toISOString()`.

### Availability filter — `src/utils/roomAvailabilityFilter.ts`

Pure helpers: `timeToMinutes`, `hasContiguousHours` (merges overlapping am/pm slots into a contiguous free block), `filterRoomsByCriteria` (capacity + contiguous hours). Prefer extending these over embedding filter logic in the page.

---

## 8. Pages

| Path                             | Purpose                                                   |
| -------------------------------- | --------------------------------------------------------- |
| `login/LoginPage.tsx`                          | Microsoft / optional dev email login, remember me, locale |
| `home/HomePage.tsx`                            | Welcome + Start Booking                                   |
| `start-booking/StartBookingPage.tsx`           | Start booking questions                                   |
| `start-booking/CreateMinistryModal.tsx`        | Create ministry application modal                         |
| `rooms/RoomFilterPage.tsx`                     | Results, filters, slot select, create booking             |
| `my-bookings/MyBookingsPage.tsx` | Upcoming/past — **mock data**                             |
| `my-profile/MyProfilePage.tsx`   | Profile + payment history — **partial mock**              |
| `contact/ContactPage.tsx`        | Stub                                                      |

---

## 9. i18n

| Item       | Value                                                       |
| ---------- | ----------------------------------------------------------- |
| Init       | `src/i18n/index.ts`                                         |
| Locales    | `en`, `zh-TW`, `zh-CN`                                      |
| Namespaces | `common` (default), `auth`, `errors`, `language`, `booking` |
| Storage    | `localStorage` key `app_locale`                             |
| Switch API | `change_app_language`                                       |

Resources are **statically imported and bundled**. Adding a namespace or locale means editing `src/i18n/index.ts` in three places: import, `resources`, `ns`. Keep the same keys in all three locale JSON files.

This module uses **snake_case** function names (`normalize_locale_code`, `change_app_language`, `sync_moment_locale`). Match that style when editing `src/i18n/`. Never call `i18n.changeLanguage` directly for app switches.

In UI: `t("booking:…")`. Default copy in components is English.

---

## 10. Styling & Dates

### Styling

- `src/index.css`: Figtree font, Tailwind v4, `@import "@efcnewlife/newlife-ui/theme/reference.css"`, `@source "../node_modules/@efcnewlife/newlife-ui/dist"`.
- Two token layers: app `booking-*` colors (`bg-booking-bg`, `text-booking-primary`, …) and library M3 roles (`bg-surface-container`, `text-on-surface-variant`).
- Merge class names with `cn` from **`@efcnewlife/newlife-ui`** (no local `src/utils/cn`).
- Prefer library `Button` / `Input` / `Select` over hand-rolled equivalents.
- Icons: `react-icons`, prefer the **`md`** set.
- SVGR is configured for named `ReactComponent` export; no `.svg` imports under `src/` today (assets live in `public/` and `docs/design/`).

### Dates

Use **moment**, not dayjs/date-fns. API date params are `YYYY-MM-DD`. `BookingDatePicker` is a custom moment calendar — do not introduce flatpickr unless the user asks.

---

## 11. Adding a Page (Checklist)

1. Add the page under `src/pages/<kebab-name>/`.
2. Register the route in `src/routes/index.tsx` (usually under `ProtectedRoute` + `AppLayout`).
3. If it should appear in the top nav, update `NAV_ITEMS` in `src/layout/TopNavBar.tsx`.
4. Endpoints → `src/api/config/index.ts` only; wrap in `src/api/services/*`; pages call services.
5. Types → `src/types/`.
6. Copy → all three locales × relevant namespace; wire a new namespace in `i18n/index.ts` if needed.
7. Prefer `@efcnewlife/newlife-ui` and existing booking/layout components.
8. When replacing mocks, swap the import site rather than wrapping the mock.
9. Verify: `pnpm type-check` (and `pnpm lint` if you want; not a required agent check in sibling repos).

---

## 12. Naming Conventions

| Kind                               | Convention                  | Example                       |
| ---------------------------------- | --------------------------- | ----------------------------- |
| Variables, functions (most of app) | camelCase                   | `isAuthenticated`             |
| Components / page files            | PascalCase                  | `StartBookingPage.tsx`        |
| Page / feature folders             | kebab-case                  | `start-booking/`, `my-bookings/` |
| Constants, env vars                | UPPER_SNAKE_CASE / `VITE_*` | `VITE_API_BASE_URL`           |
| Route paths                        | kebab-case                  | `/my-bookings`                |
| Comments / default copy            | English                     | User strings via i18n         |

**Exception:** `src/i18n/*` and several utils (`bookingMock`, `bookingFormat`) use **snake_case** function names. Match the local file.

Prefer arrow functions for components. Files that use HTML / `ReactNode` / `JSX.Element` must use `.tsx`.

---

## 13. Environment Variables

Centralized in `src/config/env.ts`.

| Variable                                              | Role                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| `VITE_API_BASE_URL`                                   | Default `http://127.0.0.1:8000`                            |
| `VITE_API_TIMEOUT`                                    | Default `90000`                                            |
| `VITE_SHOW_DEV_LOGIN`                                 | Dev email sign-in                                          |
| `VITE_DEV_LOGIN_EMAIL`                                | Default `dev@local.test`                                   |
| `VITE_SKIP_AUTH`                                      | Dev skip-auth helper                                       |
| `VITE_AZURE_CLIENT_ID` / `TENANT_ID` / `REDIRECT_URI` | MSAL (`REDIRECT_URI` defaults to `window.location.origin`) |
| `VITE_APP_NAME` / `TITLE` / `VERSION`                 | Branding                                                   |
| `NODE_AUTH_TOKEN`                                     | pnpm GitHub Packages (not a Vite var)                      |

Derived flags: `IS_DEV`, `IS_SKIP_AUTH`, `IS_SHOW_DEV_LOGIN`, `IS_MICROSOFT_LOGIN_ENABLED`.

---

## 14. Do NOT (Agent Guardrails)

| Action                                                       | Reason                                   |
| ------------------------------------------------------------ | ---------------------------------------- |
| Call `/admin/api/v1`                                         | This app is the member `/api/v1` surface |
| Hardcode API paths outside `src/api/config`                  | Contract lives in one place              |
| Expand raw `httpClient` usage in pages                       | Go through services                      |
| Use `import.meta.env` outside `src/config/env.ts`            | Env is centralized                       |
| Assume my-bookings / profile / contact are live APIs         | Still mock or stub                       |
| Introduce dayjs or wire unused `flatpickr`                   | Stack is moment + custom date picker     |
| Copy portal's backend-driven menu / DataPage architecture    | Different routing and UX                 |
| Ship a second Tailwind theme that fights newlife-ui M3 roles | Host `@theme` + library `reference.css`  |
| `git commit` / `push` / `merge` unless the user asks         | Automation policy                        |

Keep Vite **port 5174** / `strictPort` in mind — the admin portal uses 5173.

---

## 15. Key Files Index

| File                                     | Why read it                     |
| ---------------------------------------- | ------------------------------- |
| `package.json`                           | Scripts, dependencies           |
| `vite.config.ts`                         | Port 5174, alias, SVGR          |
| `src/config/env.ts`                      | Env flags                       |
| `src/App.tsx` / `src/main.tsx`           | Bootstrap                       |
| `src/routes/index.tsx`                   | All routes                      |
| `src/context/AuthContext.tsx`            | Auth state                      |
| `src/auth/msalInstance.ts`               | Entra MSAL                      |
| `src/api/config/index.ts`                | Endpoint map                    |
| `src/api/services/httpClient.ts`         | HTTP pipeline                   |
| `src/api/services/facilityService.ts`    | Availability + create booking   |
| `src/api/services/ministryService.ts`    | Ministries + applications       |
| `src/pages/home/HomePage.tsx`                | Authenticated Home              |
| `src/pages/start-booking/StartBookingPage.tsx` | Start booking questions       |
| `src/utils/startBookingFlow.ts`              | Step / When / Rooms query seam  |
| `src/pages/rooms/RoomFilterPage.tsx`         | Search + book                   |
| `src/types/roomSearch.ts`                | Search criteria                 |
| `src/utils/roomAvailabilityFilter.ts`    | Client-side availability filter |
| `src/i18n/index.ts`                      | Locales and namespaces          |
| `src/index.css`                          | Tokens / theme                  |
| `docs/design/`                           | Design HTML mocks               |

---

## 16. Mental Model for AI Agents

When given a task, first classify it:

| Task type                        | Start here                                                        |
| -------------------------------- | ----------------------------------------------------------------- |
| New authenticated page           | `src/routes/index.tsx` → page folder → `TopNavBar` if nav-visible |
| Start booking question flow      | `startBookingFlow.ts` + `StartBookingPage.tsx` → `RoomFilterPage.tsx` |
| API contract / new call          | `api/config` → service → `src/types/`                             |
| Auth / login / remember-me       | `AuthContext`, `authService`, `LoginPage`, `env.ts`               |
| Availability / create booking    | `facilityService` + `roomAvailabilityFilter`                      |
| My bookings / profile still fake | Replace `data/mockBookings.ts` / `mockProfile.ts` imports         |
| i18n string                      | `i18n/locales/*` + `i18n/index.ts` if new namespace               |
| Visual tokens / styling          | `index.css` + newlife-ui components                               |
| Design reference                 | `docs/design/*.html`                                              |

**Prefer minimal diffs.** Match existing booking/layout patterns before introducing new abstractions. Do not port portal DataPage or backend-driven menus into this app.

---

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default triage roles map 1:1 to label strings (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.
