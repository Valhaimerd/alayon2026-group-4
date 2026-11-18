# Laravel conversion

Updated 18 November 2026 (Asia/Manila).

Laravel 13, React 19 and Inertia 3 replace Next.js. The welcome page, map, styles, geometry, images, fonts, current feature scope and Supabase schema are preserved. This conversion does not implement the missing PDF features or deploy production.

## Run locally

Use PHP 8.4+, Composer 2, Node.js 24 and npm. From the repository root:

```powershell
composer install
npm ci
```

For first setup only, when `.env` does not exist:

```powershell
Copy-Item .env.example .env
php artisan key:generate
```

Preserve existing `.env` values and the application key. Start both processes:

```powershell
composer run dev
```

Open **http://localhost:8000** or **http://localhost:8000/explore**. Keep the terminal running. Vite's port 5173 serves assets, not the website. Alternatively, use `php artisan serve` and `npm run dev` in separate terminals. For compiled assets without Vite, run `npm run build`, then `php artisan serve`.

Demo mode needs no database migration. Real data/accounts need `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `.env`. Laravel does not automatically read the old `.env.local`. Legacy `NEXT_PUBLIC_*` keys are accepted as server-side fallbacks, but values must be transferred to `.env` or the host environment. Existing Supabase accounts and policies remain in use. Demo bookings are dated 12 November 2026: `/explore?date=2026-11-12`.

## Architecture

| Former implementation | Replacement |
| --- | --- |
| Next layouts and explorer server page | `resources/views/app.blade.php`, `resources/js/app.tsx`, `ExploreController` |
| React files in `app/explore` | Same interface in `resources/js/explore` |
| Global/explorer CSS | Same styles in `resources/css` |
| Next server actions | Laravel controllers behind CSRF-protected `/actions/*` POST routes |
| Supabase SSR cookies | Encrypted server-side Laravel sessions containing access/refresh tokens |
| Next router refresh/replace | Inertia visits preserving component state and scroll |
| Node SMS/account helpers | `SmsService`, `AccountController`, `SmsController`, `AccountSession` |
| Dynamic PWA manifest | `public/manifest.webmanifest` with the same values |
| Next build | TypeScript checks and Vite production build |

Laravel uses Supabase Auth/PostgREST/RPC HTTP APIs with the user's JWT and publishable key. No service-role bypass, account migration or schema rewrite is introduced. Private reads/writes verify the user, existing MFA RPC and role RPC. Instructor reads remain subject to RLS. Tokens never enter Inertia props/action responses; session locks protect refresh-token rotation. Login/logout rotate session state and CSRF tokens. Inertia history is encrypted and cleared on logout.

Existing room/instructor overlap constraints, catalog/section eligibility, capacity and term checks remain in Supabase. Class batches use `save_class_booking`; activity batches use one multi-row PostgREST write. Edits remain single-occurrence. No SQL migrations were applied.

TOTP uses Supabase factor endpoints. SMS preserves the existing session-bound challenge RPCs, HMAC format, cooldowns and server secret. `HATURIKOSMS_SEND_ENABLED` controls schedule notices, not account SMS. Provider acceptance means queued, not delivered.

## Internal action contract

Website paths `/`, `/explore`, `/welcome` and `/staff` retain their behavior.

| POST endpoint | Operation |
| --- | --- |
| `/actions/login`, `/actions/logout` | Sign-in/sign-out |
| `/actions/bookings/save`, `/actions/bookings/publish` | Registrar booking writes/publication |
| `/actions/notices/retry` | Registrar notice retry |
| `/actions/setup/{term,section,instructor}` | Administrator setup; each operation is a separate path |
| `/actions/account/profile`, `/actions/account/password` | Personal settings |
| `/actions/account/totp/{enroll,verify,remove}` | Authenticator operations; separate paths |
| `/actions/account/sms/{request,verify,disable}` | SMS operations; separate paths |

Requests use existing React form fields, Laravel session cookies and `X-CSRF-TOKEN`. Responses retain `{ ok, message }`, with enrollment/challenge fields when needed. Session-rotating actions return a new CSRF token. Validation/permission outcomes use `ok: false`; the frontend handles CSRF, throttling and transport errors. Successful mutations refresh authorized Inertia props. These internal actions do not implement the PDF's proposed versioned external REST API; Supabase contracts are unchanged.

## Verification and limits

- Frontend lint, TypeScript and production build pass; seven Node scheduling/catalog tests pass.
- Twenty-two Laravel tests pass (116 assertions): public/private props, roles/MFA, atomic payloads, conflicts/capacity, leading-zero codes, token refresh, password-session preservation, factor ownership, SMS HMAC and logout.
- Six desktop/mobile Playwright checks pass: map selection, floor switching, search, date changes, mobile sheet expansion, no horizontal overflow, CSRF rejection, redirects, manifest and welcome page.
- Before/after selected-room map screenshots match byte-for-byte at 1440x900 and 390x844. Original visual assets and copied styles are unchanged; map captures had no browser JavaScript errors.
- Composer validation passes. Tests use mocks/demo data and send no SMS.

Live Supabase sign-in/scheduling/MFA, physical-device behavior and production hosting have not been revalidated after conversion. Use an authorized test environment before claiming live checks. Existing SQL suites remain available; no database changes or deployment were performed.

The dependency audit reports a development-toolchain `picomatch` advisory propagated through Vite/globbing/lint packages. The registry's latest available version at verification was 4.0.7, within the advisory range. Its suggested forced downgrade is incompatible with the selected toolchain, so no forced change was applied. Review upstream fixes before release.

## Deployment

Use a PHP 8.4+ host with `public/` document root, built Vite assets and writable `storage/`/`bootstrap/cache/`. Install PHP production dependencies with `composer install --no-dev --optimize-autoloader`. Configure HTTPS, `APP_DEBUG=false`, `SESSION_SECURE_COOKIE=true` and a stable `APP_KEY`. File sessions/cache need persistent storage; multiple instances need an appropriate shared session/cache driver.

The former Next.js/Vercel configuration does not host Laravel by itself. No hosting cutover was performed. Do not run `php artisan migrate` as an installer for existing scheduling data; that schema remains under `supabase/migrations/`.

## Historical documents

The PDF audit describes pre-conversion commit `e181bc5`; older development-status/design sections describe historical Next.js checks. Their feature findings remain useful. Current source paths, setup and verification are in this document and the README. The conversion does not complete planned PDF/OCR, optimization, approval, RAG, audit-log or external-API features.
