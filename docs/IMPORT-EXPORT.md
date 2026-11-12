# Schedule import and export plan

Status: planned, not implemented. CSV and PDF import/export are required by the expanded scope. The workflow and defaults below are recommendations for implementation; revise them against actual department files before locking the format. See [delivery milestones](PLAN.md) and [implementation tasks](TASKS.md).

In this document, staff import/edit/draft-export controls mean the registrar role, not any signed-in instructor. Instructor accounts can view their own assignments and published schedules but cannot import, publish, or obtain registrar-wide draft exports. Account and catalog provisioning remain administrator-only.

## Workspace experience

Keep the building as the main workspace. A top toolbar offers Import and Export; only staff can import. Import opens a large, accessible review dialog or drawer over the map. Its steps are File, Map columns and rooms, Review, and Save drafts. Selecting a review row highlights its mapped room without losing the review session. Export opens a format and scope dialog. Mobile uses a full-screen dialog with an accessible room-list alternative to highlighting.

Schedule rows attach to stable room IDs already represented on the map. Importing a schedule changes room occupancy and schedule details after publication; it does not redraw walls, reposition rooms, or create rooms from guessed names. Floor-plan and room-catalog editing are separate work. Missing room mappings block saving the affected batch until corrected.

## Delivery order

1. CSV template and export, then CSV import with preview and room mapping.
2. Designed PDF export of the same filtered schedule data.
3. PDF schedule import with page extraction, correction, and the shared validation/preview flow.
4. Optional AI provider assistance for difficult extraction or mappings; deterministic validation and staff approval remain mandatory.

PDF import is part of the expanded release, not merely an export button. Ship it incrementally: supported text-based tables first, scanned PDF/OCR support afterward if required by the department's samples. Report unsupported files explicitly; never treat an empty extraction as a successful import.

## CSV version 1

One row represents one same-day booking occurrence. UTF-8, comma-separated, with a header row; accept a UTF-8 BOM, quoted delimiters, escaped quotes, and line breaks in quoted fields. Keep the first version aligned with the existing one-time booking model. Repeating-week patterns must be expanded into dated occurrences before import; do not infer recurrence silently.

The expanded format resolves the fixed [subject catalog](SUBJECT-CATALOG.md) and existing account-backed instructors. [Academic schedule details](SCHEDULE-DATA.md) owns their meanings and access rules. Complete tasks 14–16 before implementing class imports; no CSV/PDF/AI flow may create a subject, instructor profile or account. The generic booking title is not a substitute for catalog/component relationships.

| Column | Rule |
| --- | --- |
| `booking_id` | Optional; blank creates a draft. An existing ID requires explicit update mode and a reviewed diff. Never trust an ID as authorization. |
| `record_type` | Required `class` or `activity`. Class rows require approved academic context and an existing active instructor. Activity rows require `title`; academic columns stay blank and no subject/offering is invented. Any instructor assigned to an activity must still have an eligible existing account. |
| `room_id` | Canonical room ID; required after mapping. A room-name column from an external file can be mapped to it during review. |
| `curriculum_version` | Required class context: approved catalog version; resolve explicitly when absent. Do not infer from a code shared by several versions. Blank for non-teaching activities. |
| `academic_term` | Required class context: existing term identifier with confirmed dates. Blank for activities without term context. |
| `section_code` | Required class context: existing section with program/year/track. Never create sections silently. Blank for non-teaching activities. |
| `title` | Legacy/activity heading. Class display derives from the approved subject/component; non-teaching activities retain their activity title. |
| `class_code` | Required for a class row; text identifier with leading zeros preserved. Not a room or booking ID. |
| `course` | Catalog/section program, initially BSIT. If supplied, must match the selected records. |
| `subject_code` | Required for class rows: approved component code, e.g. ITCC41 or ITCC41A. Unknown codes require review, never catalog creation. Blank for non-teaching activities. |
| `component` | Lecture/main or lab, validated against the selected catalog component. |
| `parent_subject_code` | Parent subject code, inferred from an explicit approved catalog link and checked if supplied. |
| `units` | Read-only source component credits: e.g. 3 for ITCC41, 0 additional for ITCC41A. Missing values can be filled from the catalog; mismatches are errors. Parent credits are never multiplied across components or meetings. |
| `subject_name` | Catalog-derived full title; supplied values are consistency checks, not renamed subjects. |
| `year_level` | Section year and known curriculum placement; validate supplied values. Do not invent track-subject placement. |
| `instructor_code` | Institutional identifier resolved to an existing active instructor profile with an activated account. Required before applying a complete allocation; unresolved review rows cannot be published. |
| `instructor_name` | Optional display/check value only. Require explicit resolution for name-only files; never create an instructor from a name. Auth account IDs are not exchange identifiers. |
| `date` | Required ISO date `YYYY-MM-DD`, interpreted in Asia/Manila. Reject impossible dates. |
| `start_time` | Required 24-hour `HH:mm`. |
| `end_time` | Required 24-hour `HH:mm`, after start on the same date. Overnight bookings remain unsupported in version 1. |
| `class_size` | Required positive whole number for a staff import, within room capacity. |
| `published` | Informational on staff exports only. Imports never publish automatically, regardless of this value. |

Template example:

```csv
booking_id,record_type,room_id,curriculum_version,academic_term,section_code,title,class_code,course,subject_code,component,parent_subject_code,units,subject_name,year_level,instructor_code,instructor_name,date,start_time,end_time,class_size,published
,class,g1,BSIT-DEMO,2030-S1,BSIT1A,,00123,BSIT,ITCC41,lecture,ITCC41,3,Computer Programming 1,1,FAC-DEMO-A,Demo Instructor A,2030-01-08,09:00,10:00,20,false
,class,s4,BSIT-DEMO,2030-S1,BSIT1A,,00123,BSIT,ITCC41A,lab,ITCC41,0,"Computer Programming 1, Lab",1,FAC-DEMO-B,Demo Instructor B,2030-01-08,10:00,12:00,20,false
```

External files can use different column names; staff map columns to these fields and review date/time interpretation. Do not guess ambiguous dates such as `01/02/2026`. Preserve original source values alongside normalized review values until the user confirms them. Public CSV exports omit staff-only fields such as IDs for mutation, class size, and publication state; they are not an editable round-trip template. Offer the full template only to staff.

The example's curriculum version, term, section and faculty identifiers are illustrative; they will not resolve until approved records exist. It demonstrates different lecture/lab instructors without adding lab credits. Public exports omit institutional instructor allocation identifiers unless explicitly approved for publication; the displayed instructor name can remain public under the schedule policy.

For class rows, resolve the offering by the unique tuple `(curriculum version, term, section, parent subject, class code)` using canonical IDs. Lab component codes resolve to the same parent as their main component before grouping. Repeated meetings and lecture/lab rows share one offering. A missing offering may be created only as an explicit reviewed draft operation; subjects, terms, sections and accounts must already exist. Activity rows do not participate in this grouping: title, room, date/times and attendee count in `class_size` are required, academic columns stay blank, and instructor assignment is optional but account-backed if present. Validate all conditional fields for the chosen record type; do not route arbitrary classes through activity mode to bypass catalog/account rules.

## Import validation and commit

- Recommended initial limits: CSV 2 MB and 1,000 data rows; PDF 10 MB and 30 pages. Show limits before upload; enforce them server-side and revise if real samples require more. Check file type and contents, not the extension alone.
- Parsing and preview do not write bookings. Show source row/page, normalized values, mapped room/floor, errors, duplicate candidates, and before/after changes. Let staff correct values or remove rows explicitly.
- Check room existence, class size, same-day times, duplicate rows, within-file and existing published room/instructor conflicts. Section conflicts require a defined cohort/subgroup rule; do not treat all students in a program/year as one cohort.
- Resolve subject/components and instructor accounts before saving allocations. Populate read-only academic values from the catalog, reject mismatches, and require corrections for unresolved mappings. Different lecture/lab instructors are allowed for one parent offering. Repeated meetings can share a class code and are not duplicates on that basis alone.
- Match rooms by canonical ID first. Require confirmation for aliases or proposed name matches. Never silently choose between rooms with similar names.
- Default mode creates drafts. Explicit update mode may update drafts only in version 1; a published booking must be revised through the existing reviewed editing workflow. Do not silently overwrite, unpublish, or delete published data. Missing rows never mean deletion.
- Re-imports must show potential duplicates. Use a batch identity and idempotent commit so retries and double clicks cannot duplicate bookings. The database revalidates the selected rows in one transaction; either all selected rows are saved or none are. Return row-specific failures and preserve corrections for review.
- Save import provenance: actor, time, filename, batch ID and source row/page. Keep staging/provenance private and bounded; avoid retaining original uploads after processing by default. Define retention before retaining them. A failed commit must not leave partial bookings or notifications.
- After commit, staff see imported draft badges and room counts in the map. Public viewers continue to see published data only. Publication runs the same conflict/capacity rules as manual editing and rechecks against concurrent changes.
- Import and preview send no SMS. Creating new published schedules still follows the agreed SMS policy: notices are for changes to an already published room/time, not every imported row. Batch publication of new drafts is a later optional convenience, not an implicit step.

## CSV export

Default export scope to the selected room and full visible week, with options for floor/building, another date range, and published/draft scope. An optional instantaneous map check must not silently reduce the export to one time slot; display and confirm the export scope explicitly. Public exports contain published fields only; staff exports may include authorized draft data. Fetch all rows in the chosen scope with pagination and deterministic ordering. Include the selected scope and timezone in the download description, and use predictable filenames. Export no phone numbers, consent flags, tokens, or staff account identifiers.

Escape CSV delimiters and quotes correctly. Neutralize spreadsheet-formula prefixes in untrusted text fields and document any text normalization so exporting and re-importing cannot silently change titles. Verify a staff round-trip fixture with non-ASCII names, commas, quotes, line breaks, and formula-like text. Support clean cancellation and errors without downloading a misleading empty file.

## Designed PDF export

Generate a readable document from schedule data rather than a screenshot of the app. Recommended first template: A4 landscape timetable for a chosen room and week, plus a tabular schedule report for arbitrary date ranges. Include department/app name, room/floor, scope dates, Philippine timezone, generated timestamp, status or Draft watermark, a legend, and page numbers. Repeat table headers, wrap long course names, and avoid splitting a booking across pages. If there is no data, produce an explicitly labeled empty report only after confirming the selected scope.

Class code, course, subject/component code, units, subject name and year level must be included in the report, together with room, instructor and time. Lab entries are labeled Lab with their parent subject and zero additional credits. Use a readable detail table when full values do not fit in a timetable block. Count parent-subject credits once per offering; do not sum units per meeting or add lab/track alternatives twice. PDF extraction must resolve the same fixed subjects and existing instructors, leaving unresolved matches for correction rather than inventing records.

Offer a floor-plan overview as a later report page, with a legend and selected date/time; schedules must remain readable as text. Keep actual department branding configurable when official assets are supplied. Public reports exclude drafts and private contacts. Staff draft reports must be clearly marked. Include selectable text and document metadata; verify accessibility and tag support of the chosen PDF implementation rather than promising it from appearance alone.

PDF generation libraries and hosting approach are not selected yet. Choose after checking current Next.js/Vercel constraints and rendering a representative multi-page report. Inspect every exported page for clipped text, broken fonts, page breaks, and consistent margins before treating PDF export as complete.

## PDF import

Extract supported text-based schedule tables with source-page references. Show extracted rows and uncertain/missing cells in review; staff map fields and room names to the same CSV version 1 model. Apply the same duplicate, conflict, permission, and atomic-save rules. Password-protected, malformed, image-only, or unsupported layouts must show actionable errors instead of invented values. AI is not required for supported deterministic extraction.

A scanned PDF needs OCR or an explicitly selected multimodal provider; show this distinction before processing. Never claim arbitrary PDF support. Preserve page provenance and allow correction before saving. Validate with actual department samples and at least one unsupported sample. PDFs produced by this app should be included in the test set, but PDF is a presentation format and CSV remains the reliable structured exchange format.

## Optional AI assistance

The user is open to provider-backed AI; provider, budget, and exact scope remain undecided. Recommended first use: propose mappings or structured rows from difficult PDF tables. Return schema-validated suggestions with page references and visibly uncertain fields. Never let a model publish schedules, bypass constraints, or treat text embedded in an uploaded document as instructions. Define data handling, timeouts, cost limits, and an explicit user action before sending documents to a provider. CSV import/export and supported PDF flows must remain usable when AI is unavailable.

## Acceptance scenarios

- Staff imports a valid CSV, confirms mappings, saves drafts, then publishes through the normal workflow; the correct rooms update on the map and public view.
- Unknown rooms, ambiguous dates, duplicates, capacity excess and overlapping rows are surfaced before commit. A concurrent invalidation causes an atomic failure with no partial records.
- Retrying a batch creates no duplicate rows; re-imports do not modify published bookings without review.
- Public export cannot reveal private/draft data by changing request parameters. Staff exports contain all authorized rows, including scopes larger than one API response page.
- CSV template round-trip preserves validated booking meaning and handles quoting, Unicode and formula-like values safely.
- PDF reports remain readable for long titles, empty schedules, multiple pages and mobile-initiated downloads; page rendering is visually verified.
- Supported PDF input reaches the same editable preview; unsupported or scanned input has an explicit outcome and no automatic database writes.
