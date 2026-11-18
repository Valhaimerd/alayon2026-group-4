# Architecture and technology plan

This describes the implementation direction after the Laravel conversion. See [migration notes](LARAVEL-MIGRATION.md) for current setup/contracts and [development status](DEVELOPMENT-STATUS.md) for evidence and remaining setup; not every planned feature is complete.

## Platform and stack

| Area | Choice | Status and purpose |
| --- | --- | --- |
| Application | Laravel 13, React 19, Inertia 3, TypeScript, Vite 8 | Laravel supplies Inertia page data; the existing React interface and CSS live in `resources/`. |
| Hosting | PHP 8.4+ host | Requires a PHP runtime and `public/` document root. Former Next.js/Vercel hosting needs a separate cutover. |
| Database | Supabase PostgreSQL | Scheduling tables, reviewed migrations, access policies and overlap/capacity checks are applied. |
| Authentication | Supabase Auth | Explicit administrator/registrar/instructor roles and initial account provisioning are implemented. See development status for account-security and browser evidence. |
| Data access | Laravel controllers/services and Supabase HTTP APIs | User JWTs retain RLS. CSRF-protected writes verify roles/MFA; public reads paginate through the safe published view. |
| SMS | HaturikoSMS REST API | Sender and publication outbox integrated; sending is disabled by default. Mock and database checks pass; live sending and delivery webhooks remain unverified. |
| PWA | Web app manifest and native service worker | Manifest, icons and offline fallback implemented; no private data caching or offline edits. Device installation/update validation remains. |
| Map | Interactive SVG canvas with accessible room list | Both supplied floor references have selectable classroom overlays, pan, zoom, reset, and details. Labels, capacities and geometry are illustrative; map editing is out of scope. |
| CSV exchange | Shared normalized booking model with review and room mapping | Planned import/export. Parser choice is pending; choose one that supports quoted CSV correctly. Save batches as drafts through authorized atomic server operations. |
| PDF exchange | Text/table extraction and designed report generation | Planned import/export. Library and rendering approach require validation against representative files and Vercel constraints. No universal PDF/OCR support is assumed. |
| Scheduling | PostgreSQL and server-side validation | Recommended: deterministic conflict checks; choose implementation after recurrence and concurrency rules are defined. |
| AI | External provider, undecided | Optional assisted extraction/mapping after deterministic file workflows; provider, cost and data handling remain open. |
| Tooling | npm, ESLint, TypeScript, GitHub Actions | Starter and lint/build workflow exist. The SMS sender has a focused mocked test. |

## System boundaries

The browser requests Inertia pages and submits CSRF-protected changes to Laravel. Services access Supabase with the user's JWT; database policies remain authoritative. Tokens stay in encrypted Laravel sessions and never enter page props. Published room/time changes enqueue notices transactionally. Provider acceptance means queued, not delivered; obsolete/unpublished notices cannot be retried. Public reads exclude private contact and staff fields.

Published bookings use a PostgreSQL exclusion constraint over half-open time ranges, allowing adjacent bookings and rejecting overlaps in the same room. Capacity is validated in the database. The workspace supports same-day bookings in Philippine time and bounded weekly series expanded into at most 150 independent dated occurrences. A single multi-row insert saves the whole series atomically; a published conflict on any date rejects every row. Editing changes one occurrence, without a persistent recurrence rule or series-wide operations. Drafts may overlap, but cannot be published if a conflict exists.

## Data concepts

The schema contains rooms, explicit account roles, private instructor profiles, catalog components, academic terms, class sections, subject offerings, dated bookings, and SMS notifications. Buildings, persistent recurrence rules, detailed room-use policies and audit history remain future work. Review actual migration files for implemented columns and access policies.

The expanded baseline is implemented: an approved versioned subject catalog with explicit lecture/lab components; class sections and subject offerings; account-backed instructor profiles; and component-level allocations/meetings. [Academic schedule details](SCHEDULE-DATA.md) defines the requirements and [the catalog](SUBJECT-CATALOG.md) transcribes the screenshots. Subject names and credits derive from catalog selections. Labs reference a parent and carry zero additional credits; instructors can differ between lecture and lab.

The broad staff membership model is replaced by explicit administrator, registrar and instructor authorization. Registrars cannot insert instructor profiles, provision Auth accounts, edit the catalog, or grant roles. Instructor profiles require a unique existing Auth-user link and active account eligibility; instructors read only their own private allocations plus public schedules. Enforce the boundaries in database policies and server mutations, not just menus. Retain historical assignments after account deactivation. These boundaries have dedicated rolled-back role-context tests; legacy staff tests alone are insufficient evidence.

Published class allocations reject instructor overlaps as well as room overlaps, atomically across components and rooms. Section/group overlap rules need confirmation. Registrar-entered start/end times remain independent of academic units; no contact-hour conversion is assumed. Publishability also requires approved component-parent linkage and active instructor eligibility. Migrate old title/free-standing instructor records with explicit mapping and no invented catalog entries or accounts.

## Planned weekly schedule view

The default read scope will be the selected Monday–Sunday week in Asia/Manila, using half-open bounds from local Monday midnight to the next Monday. Page through the entire scope with stable ordering. Query public published data and authorized staff drafts separately as appropriate; a UI draft toggle must not widen public access. Normalize week navigation and URL state without relying on the server/browser timezone. Preserve selected room and canvas state when changing week.

Weekly summaries reflect the complete loaded week. Loading/error states must show unknown data, not zero bookings or availability. Optional instantaneous checks use the same selected week's data and never filter away the full weekly timetable. Existing same-day dated bookings can populate the grid without a recurrence schema change. Verify year/month boundaries, Sunday bookings, back-to-back intervals, drafts overlapping each other, and schedules outside normal visible hours. [The proposal](CLASS-SCHED-PROPOSAL.md#weekly-schedule-as-the-default) owns the interaction requirements.

## Planned data exchange boundaries

Follow [the import/export specification](IMPORT-EXPORT.md). CSV parsing and PDF extraction produce the same normalized review rows; they never write directly to bookings. Staff resolve room IDs, correct fields, and select rows before an authorized server operation revalidates and saves drafts transactionally. Plan private batch provenance and idempotency storage in reviewed migrations before implementation. Published schedule changes retain the existing database conflict/capacity rules and notification policy.

Public exports use the safe published projection. Staff export scopes require server-side authorization; filenames and UI filters are not access controls. Use pagination to export the complete selected dataset. File size/page/row limits must be checked server-side. Large PDF/OCR jobs may need bounded background processing; choose that architecture after testing representative files, not before. No new service, package, schema, or AI provider is selected by this plan.

## PWA behavior

Recommended initial scope: manifest, icons, install support where available, cached application shell, and a clear offline message. Do not cache private records or queue edits offline by default. If offline viewing becomes a requirement, define which published data is stored, its age, and shared-device behavior before adding it. Verify installation and update behavior on target browsers and devices.

## Deployment and environments

Deploy Laravel to a PHP-capable host with HTTPS, `public/` document root, built Vite assets and writable storage/cache. The former Next.js/Vercel workflow is historical; no hosting cutover was performed. Configure environments separately and confirm Supabase migration deployment independently. Keep preview writes isolated from production. See the migration notes for release configuration.

## Verification strategy

For each workflow, verify authorization, input validation, error and loading states, and relevant database policies. Test overlapping bookings, adjacent times, capacity boundaries, recurring exceptions and concurrent submissions once the rules are confirmed. Check keyboard and mobile use for maps and schedules, and test PWA offline and update behavior on supported browsers. Run lint and build for repository changes.
