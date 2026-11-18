# CISC SchedFlow

Alayon 2026 · Group 4

CISC SchedFlow is a classroom scheduling application centered on an interactive building map. Public visitors view published schedules, registrars manage class allocations and department activities, administrators configure academic setup and instructor account links, and instructors view their own allocations.

The application uses **Laravel 13, React 19, Inertia 3 and Supabase**. Laravel replaces the former Next.js application while preserving the existing interface and assets. It **partially implements the original PDF proposal**. See the [implementation audit](docs/PDF-IMPLEMENTATION-AUDIT.md) for the original comparison, the [implementation checklist](docs/PDF-IMPLEMENTATION-CHECKLIST.md) for remaining features, and the [Laravel migration notes](docs/LARAVEL-MIGRATION.md) for the new architecture and verification.

## Current features and limits

| Area | Available in source | Remaining work |
| --- | --- | --- |
| Building explorer | Two floors, selectable room overlays, search, pan, zoom, Fit building and responsive panels | Authoritative room-data verification and inventory management |
| Schedule viewing | Daily published schedules, academic details and authorized private allocations | Weekly calendar, complete filters and interval availability |
| Manual scheduling | Create/edit classes and activities, drafts, publication and bounded weekly creation | Series-wide edits, examination rules and separate approval/version history |
| Validation | Published room/instructor overlap protection, normal capacity and academic term checks | Section conflicts, equipment, suitability, operating hours and maintenance rules |
| Academic setup | Provisional BSIT catalog, linked lecture/lab components, terms, sections and account-backed instructors | Official curriculum confirmation and unresolved elective/track mappings |
| Security | Supabase authentication, administrator/registrar/instructor roles, profile/password settings and optional TOTP/SMS MFA | Expanded role workflows and account administration |
| SMS and PWA | Schedule-change outbox/retry integration, manifest, icons and offline fallback | Target-environment integration, delivery and physical-device install/update verification |

PDF extraction, OCR, AI interpretation, automated room assignment, RAG, the natural-language assistant, versioned external integration APIs, configurable institutional branding and application audit logs remain unimplemented. CSV exchange and designed PDF export are also planned.

Weekly creation expands into at most 150 independent dated bookings; editing changes one occurrence. It does not provide a weekly calendar display. Room labels, capacities and geometry remain illustrative until verified. Source availability does not establish production readiness; see [development status](docs/DEVELOPMENT-STATUS.md) for historical evidence and limitations.

## Technology

- Laravel 13, PHP, React 19.3.0, Inertia 3, TypeScript and Vite 8.
- Supabase PostgreSQL and Auth, accessed by Laravel with the user's JWT so existing row-level security remains active.
- SVG floor-map overlays, CSS and Lenis scrolling.
- HaturikoSMS for account verification and schedule-change notices.
- Node.js 24 and npm, using the committed `package-lock.json`.

The PDF proposes a different stack. The [architecture](docs/ARCHITECTURE.md) describes the current direction; the audit records the differences.

## Local setup

Use **PHP 8.4+, Composer 2, Node.js 24 and npm**. PHP needs the standard Laravel extensions, including cURL, OpenSSL, mbstring, XML and fileinfo. No local scheduling database is needed: sessions/cache use files and scheduling data stays in Supabase.

From the project folder, install the dependencies:

```powershell
composer install
npm ci
```

For a new local configuration, create `.env` and generate its Laravel application key:

```powershell
Copy-Item .env.example .env
php artisan key:generate
```

Preserve an existing `.env` and its `APP_KEY`. Environment files are ignored by Git. Start Laravel and Vite together:

```powershell
composer run dev
```

Open **[localhost:8000](http://localhost:8000)** for the welcome page or **[localhost:8000/explore](http://localhost:8000/explore)** for the building workspace. Keep the terminal running; Ctrl+C stops both processes. The Vite address is an asset server, not the website.

Alternatively, run `php artisan serve` in one terminal and `npm run dev` in another. To run without Vite's development server, use `npm run build` followed by `php artisan serve`.

Without Supabase configuration, the explorer displays labeled demo schedules without persisted scheduling or account access. Sample bookings are dated 12 November 2026: open `/explore?date=2026-11-12` to see them. Fill in the Supabase values in `.env` and restart Laravel for real data and account access. Laravel does not automatically load the former `.env.local`; transfer existing configuration locally without committing secrets.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `APP_KEY` | Laravel encryption key, generated once with `php artisan key:generate` |
| `APP_URL` | Local or deployed website URL; local default is `http://localhost:8000` |
| `SUPABASE_URL` | Project URL; required for persisted data and account access |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable project key; Laravel forwards each user's JWT and preserves RLS |
| `HATURIKOSMS_API_KEY` | Server-only provider key for SMS features |
| `ACCOUNT_SMS_SERVER_SECRET` | Server-only account SMS credential; requires coordinated database setup |
| `HATURIKOSMS_SEND_ENABLED` | Enables schedule-change sending only when `true`; example defaults to `false` |
| `SCHEDULE_PUBLIC_URL` | Public HTTPS schedule-page URL included in schedule-change notices |

`HATURIKOSMS_SEND_ENABLED=false` does **not** disable account login/enrollment SMS. Account SMS also requires provisioning the server credential's SHA-256 digest through trusted database access. Follow [account settings and MFA](docs/ACCOUNT-SETTINGS.md) for setup. Keep provider keys and server credentials out of browser code, logs and committed files.

### Database and initial access

Scheduling schema history remains in `supabase/migrations/`. The Laravel conversion does not replace Supabase Auth, migrate existing accounts, or reapply scheduling migrations. Confirm the intended database target and migration history before changes. **Do not run `php artisan migrate` to install the scheduling schema**; a fresh Supabase environment needs the reviewed SQL migrations in order.

Initial access uses guarded scripts under `supabase/admin/`. There is no public self-registration or role self-promotion. Accounts need explicit roles; administrator privileges alone do not grant scheduling permission.

1. Sign in as an administrator and open **Academic setup** in `/explore`.
2. Create the actual academic term and class sections.
3. Create/invite and confirm instructor accounts through Supabase Auth administration, then link active profiles in Academic setup.
4. Sign in as a registrar, select a room and use **New booking** to choose approved subjects/components and existing instructors.

See [academic setup and allocation contracts](docs/ACADEMIC-SETUP.md) for provisioning, permissions and legacy records. Registrars cannot create subjects, instructor accounts or access roles. The explorer's profile button provides display-name/password settings and optional MFA.

## Commands and verification

| Command | Purpose |
| --- | --- |
| `composer run dev` | Start Laravel and Vite together |
| `php artisan serve` | Start Laravel only, normally at port 8000 |
| `npm run dev` | Start Vite's frontend asset server |
| `npm run lint` | Run ESLint |
| `npm test` | Run shared scheduling and curriculum Node tests |
| `composer test` | Run Laravel unit/HTTP tests with mocked Supabase and SMS calls |
| `npm run build` | Check TypeScript and produce Vite production assets |
| `npm start` | Start Laravel; requires running Vite or built assets |
| `npm run test:browser` | Run desktop/mobile Playwright checks against a separate demo server |

Run lint, both test suites and build before submitting changes. For browser tests, install Chromium once with `npx playwright install chromium`, then run `npm run test:browser`. Build assets first and stop any Vite development server so browser tests can use the production bundle.

The PDF audit's missing-dependency results are historical. Current migration checks and limits are recorded in [Laravel migration notes](docs/LARAVEL-MIGRATION.md).

SQL and opt-in live tests are separate from `npm test`. Run them only on a confirmed authorized test target using documented rollback/cleanup procedures. Live checks create temporary records; unit tests mock SMS and send no messages. See [development status](docs/DEVELOPMENT-STATUS.md) for live-test configuration.

## Routes

| Route | Behavior |
| --- | --- |
| `/` | Welcome page served from `public/welcome.html` |
| `/explore` | Shared public/account building workspace |
| `/explore?signin=1` | Workspace with the account sign-in dialog |
| `/welcome` | Redirects to `/` |
| `/staff` | Redirects to `/explore?signin=1` |

## Welcome page and scroll motion

Open / in the running app (/welcome redirects there), or open [public/welcome.html](public/welcome.html) directly in a browser for the registrar welcome reference. GSAP 3.13.0 and Lenis 1.3.27 load from pinned CDN URLs. If a CDN is unavailable, the page retains native scrolling and readable content. Explore links to the map at /explore, and the sign-in link opens the general account dialog at /explore?signin=1. The legacy /staff URL redirects to the same dialog.

The welcome page uses one GSAP ticker for both Lenis and ScrollTrigger. Its rooms/classes/schedules typography stage, masked headline, moving room/class/time labels, preview cursor following, and traveling Explore button respect reduced motion. Touch scrolling stays native; smoothing is for wheel input. The Explore button moves between hero, navbar, and final section.

The React app mounts one npm-installed Lenis instance in `resources/js/smooth-scroll.tsx`. Its effect destroys the instance on unmount. Map gestures, panels and dialogs retain native input. Add `data-lenis-prevent` to future scrollable overlays that should handle their own gestures.

The PWA opens at `/explore`. Its service worker supplies a static offline fallback; private schedules and offline writes are not cached or queued.

## Repository guide

| Path | Contents |
| --- | --- |
| `app/` | Laravel controllers, middleware, Supabase/session/SMS services and scheduling helpers |
| `resources/` | Existing React interface, CSS, Inertia entry point and Blade root template |
| `routes/` | Website routes and CSRF-protected action endpoints |
| `config/` | Laravel and SchedFlow service configuration |
| `lib/` | Shared TypeScript room/catalog models and scheduling validation |
| `public/` | Welcome page, floor references, fonts, icons and service worker |
| `supabase/` | Migrations, catalog seed, provisioning scripts and configuration |
| `tests/` | Laravel/Node/browser tests, SQL checks and opt-in live verification |
| `docs/` | Requirements, audit, checklist, plans, contracts and evidence |

## Deployment

Deploy to a PHP 8.4+ host with its document root set to `public/`. Install Composer production dependencies, build assets with `npm ci` and `npm run build`, configure production `.env` values, and make `storage/` and `bootstrap/cache/` writable. Use HTTPS, `APP_DEBUG=false`, a stable `APP_KEY` and `SESSION_SECURE_COOKIE=true` in production.

The former Next.js/Vercel deployment configuration is no longer sufficient to host this PHP application. Hosting migration remains separate from local conversion; no production deployment or database changes were made. Keep preview writes isolated from production, and confirm Supabase migration history independently. See [Laravel migration notes](docs/LARAVEL-MIGRATION.md).

## Project documentation

- [PDF implementation audit](docs/PDF-IMPLEMENTATION-AUDIT.md): original requirements, gaps and source evidence.
- [PDF implementation checklist](docs/PDF-IMPLEMENTATION-CHECKLIST.md): remaining work in dependency order and acceptance checks.
- [Development status](docs/DEVELOPMENT-STATUS.md): historical verification, setup and limitations.
- [Product](docs/PRODUCT.md), [proposal](docs/CLASS-SCHED-PROPOSAL.md), [delivery plan](docs/PLAN.md) and [task backlog](docs/TASKS.md): later scope and milestones.
- [Architecture](docs/ARCHITECTURE.md) and [decisions](docs/DECISIONS.md): technical direction and recorded choices.
- [Academic setup](docs/ACADEMIC-SETUP.md), [schedule data](docs/SCHEDULE-DATA.md) and [subject catalog](docs/SUBJECT-CATALOG.md): allocation rules and contracts.
- [Account settings and MFA](docs/ACCOUNT-SETTINGS.md): account security and SMS configuration.
- [Import/export plan](docs/IMPORT-EXPORT.md): planned CSV/PDF exchange workflows.

Some older status paragraphs, task checkboxes and route decisions need reconciliation, as recorded in the audit. Assess completion using actual source and dated verification evidence.
