# Decisions

Record consequential decisions here with their context and reasoning when made. Confirmed product requirements belong in [PRODUCT.md](PRODUCT.md).

## Database changes

Keep schema changes and access policies in Supabase migration files under `supabase/migrations/`, with the Supabase working directory at the repository root. The intended GitHub production branch is `main`. Automatic deployment applies pending migrations to the connected production database when enabled; confirm its setting before relying on it. Review and test migrations before merging.

## Single-page workspace

Decided 2026-11-12. All public and staff functions live on the building explorer page at `/`. The first implementation placed staff sign-in and schedule management on a separate `/staff` page because the task only asked for a staff-only form, and a separate server-rendered route was the quickest way to gate it. That drifted from the proposal, which already called for staff actions in the map workspace without navigating away. The `/staff` page is to be replaced by in-workspace panels and dialogs as described in the [proposal](CLASS-SCHED-PROPOSAL.md#single-page-workspace); `/staff` should redirect to `/`. Existing server actions and database policies remain the access boundary.

## Authentication direction

Authenticator-app MFA is the preferred option if the requirements permit it. HaturikoSMS is required for project SMS functionality; whether SMS is required for authentication remains open.

## Expanded release and file exchange

Requested 2026-11-12: expand beyond the original five-hour demo to support CSV and PDF schedule import/export, with possible provider-backed AI later. The building explorer remains the shared workspace. The revised deadline and AI provider are not specified.

Recommended implementation order: CSV exchange, designed PDF reports, supported PDF import with review, then optional AI extraction/mapping assistance. Imported schedules map to existing room IDs; geometry editing is a separate concern. Preview and validation precede draft saving; uploads do not publish automatically. Detailed proposed defaults and acceptance cases live in [IMPORT-EXPORT.md](IMPORT-EXPORT.md), which is the single source for the exchange format.

## Weekly schedule default

Confirmed 2026-11-12: room schedules default to the full week, with an expandable Monday–Sunday timetable in the right panel. Daily or instantaneous checks are optional, and the building remains the primary workspace. Use week navigation and weekly booking summaries instead of applying a time filter by default. A weekly display does not create recurring classes. See the [proposal](CLASS-SCHED-PROPOSAL.md#weekly-schedule-as-the-default) for interaction rules and task 13 for verification.

## Fixed subjects and existing instructor accounts

Confirmed 2026-11-12: subjects are predetermined; registrars cannot add subjects or create instructors. Administrators provision instructor accounts. Registrars allocate active existing instructors; instructors have view-only access to their own allocations and published schedules. Lecture and lab may have different instructors while remaining linked to the same subject offering and section. Labs have zero additional credits, and meeting start/end times are entered explicitly rather than calculated from credits.

Treat the supplied curriculum as BSIT with all three tracks available as section-level choices. Official curriculum version, elective substitution, add101, NSTP alternatives and lab-group rules remain open. The [catalog transcription](SUBJECT-CATALOG.md) and [schedule design](SCHEDULE-DATA.md) supersede earlier plans for free-text subjects and registrar-created instructors. Existing application code must be migrated before claiming compliance.
