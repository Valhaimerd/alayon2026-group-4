# CISC SchedFlow

A classroom and room scheduling system with an interactive 2D building map and role-based access for registrars and instructors.

**Live URL:** To be provided; no Laravel production deployment has been verified.

**API docs:** To be provided; `/api/docs` and a versioned external API are not implemented. The current internal action contract is documented in [Laravel migration notes](docs/LARAVEL-MIGRATION.md#internal-action-contract).

**Team:** SchedFlow

**Section:** To be provided

**Adviser/Instructor:** Buntod, Rinante

| Team member | Project role |
| --- | --- |
| Magdaraog, Emmanuel B. | Backend Developer |
| Oinal, Baby Lyn A. | Frontend Developer |

This README follows the required project-submission structure. Replace outstanding details with confirmed information before submission. The implementation partially satisfies the original PDF proposal; see the [audit](docs/PDF-IMPLEMENTATION-AUDIT.md) and [implementation checklist](docs/PDF-IMPLEMENTATION-CHECKLIST.md).

## Features (by role)

| Role | Available features |
| --- | --- |
| **Public visitor** | View published daily schedules and room details; search rooms/subjects; switch floors; pan, zoom and select rooms on the map. |
| **Registrar** | Sign in; choose approved subjects, sections and existing instructors; create/edit classes and department activities; save drafts; publish/unpublish schedules; review/retry instructor notices when configured. |
| **Instructor** | Sign in; view their own allocations, including permitted drafts, and published schedules; manage personal display name, password and optional MFA. |
| **Administrator — setup support** | Configure terms and sections, link confirmed instructor accounts, and activate/deactivate instructor profiles. Scheduling also requires an explicit registrar role. |

Registrars and instructors share the email/password sign-in form at `/explore?signin=1`. Account roles are verified on the server; users cannot assign themselves permissions. The welcome-page sign-in link opens this form over the map. If authentication is unconfigured, the form stays visible, explains the limitation and disables submission.

Current scheduling checks reject published room/instructor overlaps, excess normal room capacity and invalid academic allocations. Weekly creation expands into at most 150 dated bookings; edits affect one occurrence. Conference Room is selectable and uses a **provisional maximum of 25 people**, pending capacity confirmation.

The PWA provides a manifest, icons and a static offline fallback. Private schedule data and offline writes are not cached. Optional SMS sending requires server configuration and recipient consent; provider acceptance does not confirm delivery.

**Still planned:** full weekly calendars, dedicated room-use request and examination workflows/templates, exam-specific capacities, CSV/PDF exchange, OCR, automated assignment, approval/version history, RAG/assistant inquiries, external integration APIs and application audit logging. Registrar interviews must confirm the remaining parameters and official templates. Room boundaries, equipment and capacities still need authoritative verification.

## Architecture (diagram image)

![CISC SchedFlow architecture: React and Inertia communicate with Laravel; Laravel accesses Supabase using user JWTs and optionally sends messages through HaturikoSMS.](docs/images/architecture.png)

[Editable diagram source](docs/images/architecture.svg) · [Architecture details](docs/ARCHITECTURE.md)

- The browser runs the React/Inertia interface and submits same-origin, CSRF-protected requests to Laravel.
- Laravel handles routes, validation, role/MFA verification and encrypted server-side sessions. Supabase access/refresh tokens stay on the server.
- Laravel accesses Supabase Auth, PostgreSQL/PostgREST and existing RPCs with the signed-in user's JWT. Row-level security and database conflict constraints remain authoritative.
- HaturikoSMS handles configured account-verification messages and schedule-change notices.
- Vite builds frontend assets. Sessions/cache use Laravel file storage locally; a suitable shared driver is needed for multiple application instances.

Scheduling schema history remains in `supabase/migrations/`. The Laravel conversion preserves the Supabase database and existing accounts; `php artisan migrate` is not the installer for this scheduling schema.

## Tech stack

| Layer | Technology |
| --- | --- |
| Backend | Laravel 13, PHP 8.4+, Composer 2 |
| Frontend | React 19.3.0, Inertia 3, TypeScript, CSS |
| Assets and development | Vite 8, Node.js 24, npm |
| Database and authentication | Supabase PostgreSQL, Auth, RLS and RPCs |
| Building map | Interactive SVG overlays and supplied floor-plan images |
| Motion | Lenis; pinned GSAP/Lenis CDN scripts on the welcome page |
| Notifications | HaturikoSMS HTTP API |
| PWA | Web app manifest and native service worker |
| Tests and CI | PHPUnit/Laravel HTTP tests, Node tests, ESLint, Playwright, GitHub Actions |

Exact dependencies are recorded in [composer.json](composer.json), [package.json](package.json) and their committed lockfiles.

## Run locally (clone, copy .env.example to .env, docker compose up)

**Docker Compose status:** this repository does not currently contain a Dockerfile or Compose configuration. `docker compose up` is not a working startup command yet. The supported setup below uses local PHP and Node.js; containerization remains an outstanding submission requirement.

Install PHP 8.4+, Composer 2, Node.js 24 and npm. PHP needs the standard Laravel extensions, including cURL, OpenSSL, mbstring, XML and fileinfo.

For a fresh checkout in PowerShell:

```powershell
git clone https://github.com/Valhaimerd/alayon2026-group-4.git
cd alayon2026-group-4
Copy-Item .env.example .env
composer install
npm ci
php artisan key:generate
composer run dev
```

Open **[http://localhost:8000](http://localhost:8000)** for the welcome page or **[http://localhost:8000/explore](http://localhost:8000/explore)** for the map. Keep the terminal running; Ctrl+C stops the development processes. Vite's port 5173 is the asset server.

For an existing checkout, preserve `.env` and `APP_KEY`; do not repeat the copy/key-generation steps. If port 8000 is occupied, start `php artisan serve --port=8001` and `npm run dev` in separate terminals, then open port 8001.

Without Supabase configuration, the map uses labeled demo data. Sample bookings are dated **12 November 2026**: open `/explore?date=2026-11-12` to see them. For real accounts/data, configure `.env` and restart Laravel. The former `.env.local` is not automatically loaded.

| Environment variable | Purpose |
| --- | --- |
| `APP_KEY` | Laravel encryption key generated once during initial setup |
| `APP_URL` | Application URL; local default is `http://localhost:8000` |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Project publishable key; user JWTs retain RLS |
| `HATURIKOSMS_API_KEY` | Server-only SMS provider key |
| `ACCOUNT_SMS_SERVER_SECRET` | Server-only account SMS credential, requiring coordinated database setup |
| `HATURIKOSMS_SEND_ENABLED` | Enables schedule-change sending only when `true` |
| `SCHEDULE_PUBLIC_URL` | Public HTTPS schedule-page link used in notices |

`HATURIKOSMS_SEND_ENABLED=false` does not disable account-verification SMS. See [account settings and MFA](docs/ACCOUNT-SETTINGS.md) for secret provisioning and verification behavior. Commit only the blank/example configuration, never real credentials.

Existing databases need their reviewed migration history checked before applying changes. New targets need the Supabase SQL migrations through the normal migration workflow. Instructor accounts must be confirmed in Supabase Auth, linked to profiles and explicitly assigned roles. See [academic setup](docs/ACADEMIC-SETUP.md).

## Test (commands for backend, frontend, e2e)

Run after installing Composer/npm dependencies and configuring a local application key.

**Backend:**

```powershell
composer test
```

**Frontend lint, shared logic tests and production build:**

```powershell
npm run lint
npm test
npm run build
```

**End-to-end browser checks:**

```powershell
npx playwright install chromium
npm run test:browser
```

Build assets first and stop Vite before browser checks so they use the production bundle. Playwright starts and stops a separate demo server on port 8100 and checks desktop/mobile behavior. On Linux CI, use `npx playwright install --with-deps chromium` to install browser system dependencies.

Latest sign-in verification: **25 Laravel tests, seven Node tests and ten browser checks pass**, with lint and production build passing. Laravel tests mock Supabase/SMS; browser tests use demo mode and send no SMS. These results do not verify live accounts, SMS delivery or production hosting.

SQL policy tests and [the opt-in live-access script](tests/phase34-live.mjs) are separate. Run them only against a confirmed authorized test environment using documented rollback/cleanup procedures; see [development status](docs/DEVELOPMENT-STATUS.md).

## Deployment (CI/CD summary, hosting option)

[GitHub Actions](.github/workflows/ci.yml) runs on pull requests and pushes to `main`. It installs PHP/Node dependencies, creates a test environment key, runs lint and Node/Laravel tests, builds frontend assets, and runs Chromium browser checks.

**CD status:** the workflow verifies changes; it does not currently deploy the Laravel application. A production hosting target and deployment process must still be confirmed.

**Hosting option:** a PHP 8.4+ server or managed Laravel/PHP host, with its document root set to `public/` and Supabase retained as the external database/Auth service. The former Next.js/Vercel configuration does not run this PHP application by itself.

Typical release build commands:

```sh
composer install --no-dev --optimize-autoloader --no-interaction
npm ci
npm run build
```

Configure production environment values separately, use HTTPS, `APP_DEBUG=false`, `SESSION_SECURE_COOKIE=true`, and a stable `APP_KEY`. Make `storage/` and `bootstrap/cache/` writable and persist session storage appropriately. Keep preview/test writes isolated from production and apply reviewed Supabase migrations separately.

The current dependency audit records a development-toolchain advisory; see [migration notes](docs/LARAVEL-MIGRATION.md#verification-and-limits) for the verification limits and dependency status.

## Demo accounts (one per role, sample data only)

**Public demo:** anonymous map access works without accounts when Supabase is unconfigured. This mode does not provide authenticated registrar/instructor access.

No dedicated sample-only registrar/instructor credentials have been supplied or verified for this submission. Replace the pending entries only after provisioning accounts in an isolated demonstration environment containing sample data.

| Role | Demo email | Demo password | Status |
| --- | --- | --- | --- |
| Registrar | To be provided | To be provided | Dedicated sample-only account required |
| Instructor | To be provided | To be provided | Dedicated sample-only account required |

Both roles use **Sign in to your account** on the welcome page or `/explore?signin=1`. A provisioned registrar receives scheduling/publication tools; an instructor receives their own assignments and published schedules. Administrator provisioning remains a separate setup operation.

Never substitute real staff/instructor credentials for these demo entries. Database provisioning instructions are in [academic setup](docs/ACADEMIC-SETUP.md).

## Documentation (links to D1–D4 PDFs)

The official **D1–D4 PDFs have not been supplied or located in this repository**. Their titles and links must be filled in using the approved deliverables; the table does not assume what each designation means.

| Deliverable | Official title | PDF link/status |
| --- | --- | --- |
| D1 | To be provided | Pending approved PDF |
| D2 | To be provided | Pending approved PDF |
| D3 | To be provided | Pending approved PDF |
| D4 | To be provided | Pending approved PDF |

Add the approved PDFs to the repository or provide stable access links, then replace the pending entries with actual links.

Available working documentation:

- [PDF implementation audit](docs/PDF-IMPLEMENTATION-AUDIT.md) and [implementation checklist](docs/PDF-IMPLEMENTATION-CHECKLIST.md).
- [Product](docs/PRODUCT.md), [proposal](docs/CLASS-SCHED-PROPOSAL.md), [delivery plan](docs/PLAN.md) and [task backlog](docs/TASKS.md).
- [Architecture](docs/ARCHITECTURE.md), [Laravel migration](docs/LARAVEL-MIGRATION.md), [decisions](docs/DECISIONS.md) and [development status](docs/DEVELOPMENT-STATUS.md).
- [Academic setup](docs/ACADEMIC-SETUP.md), [schedule data](docs/SCHEDULE-DATA.md), [subject catalog](docs/SUBJECT-CATALOG.md) and [account settings/MFA](docs/ACCOUNT-SETTINGS.md).
- [Planned import/export workflows](docs/IMPORT-EXPORT.md) and [floor-plan naming/reference notes](public/floor-plans/README.md).

These working Markdown documents are not substitutes for the required D1–D4 PDFs.

## License and credits

[composer.json](composer.json) declares **MIT**. A standalone project `LICENSE` file and copyright attribution have not yet been supplied; the team must confirm these before submission.

Credits:

- Team SchedFlow: Magdaraog, Emmanuel B. (Backend Developer) and Oinal, Baby Lyn A. (Frontend Developer).
- Instructor: Buntod, Rinante.
- Laravel, React, Inertia, Vite, Supabase, Lenis, GSAP and Playwright, alongside the other dependencies recorded in the lockfiles.
- Manrope font by the Manrope Project Authors, distributed with its [SIL Open Font License](public/fonts/Manrope-OFL.txt).
- HaturikoSMS for SMS integration.
- Building/floor-plan source attribution and permission: to be confirmed. Current images are illustrative references rather than measured drawings.
