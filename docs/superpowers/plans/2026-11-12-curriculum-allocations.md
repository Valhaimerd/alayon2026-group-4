# Curriculum and account-backed allocations implementation plan

> Execute inline with superpowers:executing-plans, using focused tests and a final review.

**Goal:** Replace free-text classes and registrar-created instructors in the existing wizard with predefined subjects, account-backed allocations and explicit roles.

**Architecture:** Extend existing bookings with term, section, offering and component links. Database triggers derive academic metadata and enforce links, eligibility, dates and instructor conflicts. Keep the current map and five-step wizard; reuse dated occurrence expansion and SMS outbox.

**Tech stack:** Existing Next.js 16.4.6, React 19.3.0, TypeScript, Supabase PostgreSQL, npm; no new dependency.

**Spec:** docs/SCHEDULE-DATA.md and docs/SUBJECT-CATALOG.md.

## Constraints and decisions

- Preserve legacy bookings and standalone instructor rows; never map by name automatically.
- Catalog is explicitly provisional from supplied screenshots. Five electives, add101 and unresolved NSTP/track placements remain inactive; no invented substitutions or contact hours.
- Migrate existing staff membership to registrar only. Bootstrap administrator for the confirmed initial account separately through a guarded administrator script.
- Administrator links confirmed existing Auth accounts by email; no registrar instructor creation. Administrators without registrar role cannot schedule.
- Actual term dates and section names were not supplied. Provide setup controls; do not seed fictional production terms or instructors.
- CSV/PDF, the weekly timetable and AI are later tasks; preserve their requirements and mark their status accurately.

## Review focus

- Direct API attempts to forge units, parent links, instructors or roles must fail or derive canonical data.
- Instructor accounts can read their own drafts, never colleagues' private rows, and cannot mutate schedules.
- Inactive/pending/banned accounts cannot receive new assignments; old history stays readable.
- Series dates outside term bounds or a single conflict must reject the whole batch.
- Same class code for lecture and lab resolves one offering; unrelated components are rejected.

## 1. Schema, catalog and authorization

Files: new reviewed migration; lib/curriculum.ts; tests/curriculum.test.mjs; tests/academic-database.sql; supabase/admin scripts.

- [x] Write catalog tests for 113 source entries, 38 lab links, zero lab units, inactive unresolved entries and source totals; run to observe failure.
- [x] Add typed static catalog and repeatable SQL seed matching it; add explicit roles, instructor Auth links, terms, sections, offerings and booking metadata.
- [x] Enforce role-specific RLS, canonical metadata, term/section/component validation and published instructor exclusions. Add an atomic save RPC resolving the offering and all occurrences in one transaction.
- [x] Verify using rolled-back SQL role contexts for registrar/instructor/public, invalid links, forged metadata, inactive accounts, legacy records, room/instructor conflicts and batch rollback.

## 2. Wizard and workspace

Files: app/explore/actions.ts, page.tsx, staff-ui.tsx, workspace.tsx; new academic setup UI; lib/rooms.ts.

- [x] Remove registrar instructor-creation action/dialog. Reuse server authorization against explicit registrar role.
- [x] Add administrator-only term/section setup and linking of already confirmed instructor accounts, with no Auth-admin secret in the browser.
- [x] Change Class step to term, section, class code, subject/component and active instructor. Read-only subject name/program/units/year metadata; dates and review keep current behavior.
- [x] Add instructor view-only own-assignment list and show academic details in public room cards. Preserve legacy display and explicit mapping on later publication.
- [x] Run lint, tests, build and desktop/mobile browser checks, including missing-setup and error states.

## 3. Documentation and delivery

- [x] Update source-of-truth status, tasks, setup and contract documentation with actual verification and unresolved catalog details.
- [x] Review diff and migrations; run relevant checks once after final code changes. Record whether migrations are applied and whether deployment is pending.

## Execution ledger

- Pre-flight: database canonical metadata and eligibility are the shared interface consumed by the wizard and public projection; no frontend field is trusted for academic credits/title/year.
- Ruling: proceed inline under the user's implementation request; do not add another approval handoff for already agreed requirements.
- Ruling: actual term dates/section names were not supplied; provide administrator setup and retain no fictional production terms after verification.
- Catalog test initially failed because the typed catalog module did not exist, then passed with 113 entries/38 links and source totals.
- Database migration first tested inside a rolled-back transaction, then applied to the confirmed competition project. Migration filenames match the recorded remote versions.
- Independent review found a SQL NULL comparison accepting unrelated main components. A failing RPC test reproduced it; a separate reviewed migration fixed it. It also found banned-account deactivation and misleading empty assignment reads; both were corrected, with a failing/passing SQL regression for deactivation.
- Browser: administrator setup, confirmed account linking, academic lab draft, single-occurrence edit/publication, room/floor selection and metadata display verified at desktop/mobile sizes. Temporary records and temporary instructor role/profile removed; no SMS sent.
- Parallel account/MFA work from the other chat was preserved and integrated through its shared session guard. It has separate status and tests.
- Remaining scope: official curriculum verification, inactive elective/NSTP/track mappings, CSV/PDF, weekly timetable, physical-device checks and instructor-only browser acceptance. Those are not marked complete by this baseline.

- Final automated checks: lint, ten unit tests and production build passed. SQL suite passed after the applied fixes. Source changes remain local; web deployment is pending.
