# Product

CISC SchedFlow is a classroom scheduling PWA for a department. Staff create and publish schedules; anyone can view published schedules. The building map is the shared workspace for viewing and managing schedules. Next.js, Vercel, Supabase, and HaturikoSMS are the agreed platform direction. The original five-hour demo has expanded; the revised deadline is not yet specified.

## Expanded release scope

- Weekly room schedules are the default, shown in an expandable Monday–Sunday timetable beside the building. Specific-date/time availability remains optional. Weekly display does not imply recurring booking support.
- Class schedules include class code, course, units, subject name, and year level, in addition to room, instructor, date/time, and class size. See [academic schedule details](SCHEDULE-DATA.md) for meanings, validation and migration recommendations; these structured fields are planned, not yet implemented.
- Subjects come from the predetermined [BSIT curriculum catalog](SUBJECT-CATALOG.md). Registrars cannot add subjects or change units. Lab meetings are separate components tied to a parent subject and carry no additional credits; lecture and lab may have different instructors.
- All assigned instructors must have existing active accounts, provisioned by an administrator. Registrars select instructors; they cannot create profiles/accounts. Instructors have view-only access to their own allocations and published schedules.
- Offer all three curriculum tracks as section-level choices; resolve elective placeholders to approved subjects without duplicate credit counting. Registrars enter actual meeting start/end times instead of deriving hours from units.
- CSV schedule import and export, with column mapping, room matching, validation, and staff review before saving.
- PDF schedule import with extraction and correction, and PDF export with a designed, readable report layout.
- Imported schedules attach to existing room IDs and update room schedules and availability after publication. File import does not alter floor-plan geometry.
- Optional provider-backed AI assistance after the deterministic exchange workflow works; provider and budget remain undecided.

See [import and export plan](IMPORT-EXPORT.md) for proposed formats, workflow, boundaries, and acceptance scenarios. These file features are planned, not implemented.

See the [proposal](CLASS-SCHED-PROPOSAL.md) for scope and [architecture](ARCHITECTURE.md) for technical choices and status.

## Open decisions

- Confirm the official curriculum version, elective-slot/track mapping, unresolved add101 and NSTP alternatives, and staff approval authority. Account provisioning belongs to administrators.
- Confirm class and exam rules, room data, recurrence, conflicts, and overrides.
- Notify the assigned instructor when a published room or time changes. Confirm consent, phone number collection, budget, and failure handling in the completed workflow.
- Determine MFA and offline viewing requirements.
- Obtain representative CSV and PDF schedules, including scanned examples if relevant; confirm supported layouts, report branding, and revised deadline.
