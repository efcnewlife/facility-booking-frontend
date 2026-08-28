# Figma V3 color tokens

Facility Booking member SPA colors are sourced from Figma **EFC Booking APP – V3** and mapped into host `@theme` primitives and M3 roles in `src/index.css`. Library components consume roles only (`primary`, `surface-variant`, `cta`, …). Figma **Secondary** (yellow) actions use host `cta*` roles plus a shared `.btn-booking-secondary` utility. **Microsoft sign-in** follows **newlife-portal-frontend** (`Button variant="outline"`), not the Figma email-login blue Primary mock.

## Considered Options

- **Patch hex values only** — insufficient: old tokens mixed grey inputs (`#f4f4f4`) with Figma Light Blue (`#dfedff`), grey body text (`#6b6b6b`) with Figma Grey (`#7b7b7b`), yellow (`#fab148`) with Figma Yellow (`#ffb941`), and CTA hover pointed at white instead of Dark Yellow.
- **Add `secondary` variant to `@efcnewlife/newlife-ui`** — correct long-term, but out of scope; host `cta*` + `.btn-booking-secondary` avoids a library release.
- **Match Figma Login blue Primary for Microsoft** — rejected; portal uses outline Microsoft button for cross-product consistency.
- **Keep `/images/login/gradient-bg.png` for Landing** — rejected; CSS gradient matches Figma stops and is easier to tune in `@theme`.
- **Remap `.dark` roles from Figma V3** — rejected; V3 slice has no dark spec; existing `.dark` overrides stay unchanged.

## Token mapping (Figma → host)

| Figma variable | Hex                                   | Host primitive / role                                                                                          |
| -------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Navy-Primary   | `#1e283f`                             | `--color-booking-primary`, `--color-on-surface`                                                                |
| Blue-Secondary | `#1865d8`                             | `--color-booking-secondary`, `--color-primary`                                                                 |
| Dark Blue      | `#0043a6`                             | `--color-booking-secondary-hover`, `--color-primary-hover`, `--color-brand-600`                                |
| Yellow         | `#ffb941`                             | `--color-booking-yellow`, `--color-cta`, `--color-warning-400/500`                                             |
| Dark Yellow    | `#d99013`                             | `--color-booking-yellow-hover`, `--color-cta-hover`, `--color-warning-600`                                     |
| Light Blue     | `#dfedff`                             | `--color-booking-light-blue`, `--color-surface-container`, `--color-surface-variant`, `--color-gray-50/100`    |
| Light Grey     | `#d8d8d8`                             | `--color-booking-light-grey`, `--color-booking-grey`, `--color-cta-active` background, Search Bar field labels |
| Grey           | `#7b7b7b`                             | `--color-booking-text`, `--color-on-surface-variant`, `--color-outline`, input borders on Search Bar           |
| White          | `#ffffff`                             | `--color-surface`, `--color-on-primary`                                                                        |
| Login gradient | `#d8f8fb` (10%) → `#d1f2cd` (79.876%) | `--background-image-booking-login` → utility `bg-booking-login`                                                |

### Button semantics

| Figma component    | Default                             | Hover     | Active                 | Implementation                                             |
| ------------------ | ----------------------------------- | --------- | ---------------------- | ---------------------------------------------------------- |
| Primary (blue)     | `#1865d8` / white text              | `#0043a6` | `#7b7b7b` / white text | `Button variant="primary"` via `--color-primary*`          |
| Secondary (yellow) | `#ffb941` / navy text + navy border | `#d99013` | `#d8d8d8` / navy text  | `.btn-booking-secondary` via `--color-cta*`                |
| Microsoft sign-in  | —                                   | —         | —                      | `Button variant="outline"` (portal parity), not yellow CTA |

Primary button **active** (`#7b7b7b`) is defined in Figma but not fully wired today — `@efcnewlife/newlife-ui` `Button` applies `hover:bg-primary-hover` only; active/disabled styling may need a follow-up library or host utility if pixel parity is required.

## Background strategy

- **Login (unauthenticated Landing):** CSS linear gradient (`bg-booking-login`), not `/images/login/gradient-bg.png`. PNG may remain for design mocks only.
- **Authenticated pages** (Start booking, Timetable, profile, etc.): solid Light Blue `#dfedff` via `surface-container` / `body` default.
- **Home hero:** unchanged — full-bleed photo with overlay; Figma Home frame uses photography, not the login gradient.

## Component scope (when implemented)

Update `src/index.css` tokens and remove ad-hoc color overrides so surfaces flow through roles:

- **Login:** Microsoft → `Button variant="outline"`; landing background → `bg-booking-login`.
- **Timetable Search Bar:** navy container (`booking-primary`), field labels `text-booking-light-grey`, white bordered controls, **Update search** → `.btn-booking-secondary`.
- **Yellow CTAs** (Review booking, room cards, etc.): `.btn-booking-secondary` instead of inline `!bg-cta` / `!border-booking-primary` overrides.
- **Forms:** Input / Select field surfaces inherit `surface-variant` (`#dfedff`) globally.

Out of scope for this ADR: dark mode, newlife-ui `secondary` variant PR, redesigning Home hero photography.

## Consequences

- Authenticated chrome reads as Light Blue, aligned with Figma inner pages.
- Secondary booking actions share one yellow CTA utility; primary flows stay on library `Button primary`.
- Microsoft login matches portal outline pattern — members see consistent Entra entry across admin and booking apps.
- Search Bar on Timetable is a deliberate navy (`booking-primary`) island; labels are Light Grey, not white.
- Future color tweaks should edit `@theme` primitives/roles first, then drop component-level hex or `!important` color classes.

## References

- Figma: [EFC Booking APP – V3](https://www.figma.com/design/F89E5RBaDW8QxvRJLvBxwz/) — nodes Landing (`8018:1293`), Home (`8018:1596`), Primary button (`8005:1081`), Secondary button (`8107:1083`), Search details (`8111:2118`)
- `@efcnewlife/newlife-ui` `theme/token-contract.md`
- `newlife-portal-frontend` `src/components/auth/SignInForm.tsx` (Microsoft outline button)
