# Delivery plan

The original five-hour demo has expanded to include CSV/PDF exchange and a shared map-based staff workspace. The revised deadline is open; use milestone acceptance instead of the old time allocations. Use [implementation tasks](TASKS.md) for dependencies and checks, [import/export](IMPORT-EXPORT.md) for exchange behavior, and [development status](DEVELOPMENT-STATUS.md) for verified work. Planned features below are not completion claims.

## 1. Establish the data and access baseline

- Confirm staff account access, room list, schedule rules, and floor plan availability.
- Use a clearly labeled illustrative floor plan and sample rooms if real material is unavailable.
- Confirm Supabase deployment configuration and keep preview access separate from production writes.

## 2. Scheduling slice

- Connect Supabase, implement staff sign-in, and add reviewed migrations and access policies.
- Create rooms and bookings, validate input and conflicts, and persist changes.
- Allow staff to publish; provide public viewing of published schedules.
- Verify permissions, persistence, conflicts, and concurrent submissions.

### Expanded curriculum and allocation foundation

- Task 14: verify and seed the predetermined BSIT subject catalog and explicit lecture/lab links. Units/names are read-only to registrars; resolve curriculum version, elective placeholders, tracks, NSTP alternatives and add101 before activation.
- Task 15: administrator-provisioned instructor accounts and explicit role policies. Registrars allocate only existing active instructors and cannot create subjects, instructors or accounts. Instructors are view-only for their assignments and published schedules.
- Task 16: connect academic terms/sections, chosen track and subject offerings to component allocations. Lecture and lab may use different instructors; lab credits are not added twice. Registrar supplies meeting times; atomically enforce room and instructor conflicts. Confirm lab group/room rules before enforcing section conflicts.

## 3. Shared map workspace

- Make the full Monday–Sunday timetable the default in an expandable right panel. Add week navigation and a date-range label; retain the map and selected room when navigating weeks or editing. Use weekly map summaries and move instantaneous status checks into an optional Check a time mode. See task 13 and the [weekly-view specification](CLASS-SCHED-PROPOSAL.md#weekly-schedule-as-the-default).
- Build a responsive SVG floor-plan canvas with pan, zoom and reset controls, clickable rooms, an accessible room list, and a room schedule panel. Staff sign-in and schedule management live in the same page's panels and dialogs, not a separate page. Adapt controls and details to mobile.
- Keep the building visible during management. Import and Export live in the workspace toolbar; room schedule creation and editing live in the selected room panel. File review uses a large dialog/drawer with room highlighting and mobile alternatives.

## 4. CSV schedule exchange

- First complete tasks 14–16: fixed catalog, account-backed instructor roles and linked lecture/lab allocations. Map file rows to existing subjects/components, sections and instructor accounts; preserve legacy/activity records without fabricated values. See [academic schedule details](SCHEDULE-DATA.md).

- Define the version 1 template and export scope, then implement staff CSV export and a download template.
- Add upload, column and room mapping, review with source-row errors, duplicate detection, and atomic/idempotent draft saving. Imported rows must use the same validation as manual bookings.
- Verify map attachment, public draft privacy, re-import behavior, and complete filtered exports. See tasks 8–9.

## 5. Designed PDF export

- Produce a room/week timetable and date-range schedule report with repeated headers, readable page breaks, timezone, and draft markings where applicable.
- Verify report contents against the same export scope as CSV and visually inspect every page. See task 10.

## 6. PDF schedule import

- Collect real samples; implement supported text-based extraction with page provenance and correction using the shared import preview.
- Show unsupported/scanned-file outcomes explicitly. Add OCR only when samples require it; never auto-publish extracted rows. See task 11.

## 7. Optional provider-backed AI

- After file workflows work, choose a provider/budget and consider assisted PDF extraction or room mapping. Keep a manual path, schema validation, provenance, and staff approval. AI is optional, not a dependency of CSV/PDF exchange. See task 12.

## 8. PWA, SMS and release verification

- Connect the prepared HaturikoSMS sender to published room or time changes for the assigned instructor when consent and recipient data are available; report failures without blocking publication. Otherwise document the blocker.
- Verify mobile and keyboard behavior, core flows, deployment, and demo data. Record limitations.
- Verify manifest, icons, installation/update behavior and offline messaging. Do not cache private data or queue offline edits.
- Include CSV/PDF authorization, file limits, failed/duplicate imports, complete exports, and rendered PDF layout in release checks.

RAG, multi-building support, external system APIs, and floor-plan editing remain later work. Bounded weekly series creation is implemented as independent dated bookings; persistent recurrence, series-wide editing and exam-specific rules remain future work; CSV version 1 represents one-time dated occurrences and must not silently invent recurrence.

## Task readiness

Each task states outcome, scope, dependencies, acceptance criteria, and verification. Mark assumptions and missing criteria. Review and test database migrations before merging to `main`; confirm Supabase deployment if enabled.
