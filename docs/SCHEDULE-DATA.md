# Academic schedule details

Status: core catalog, account-role and lecture/lab allocation behavior is implemented. The catalog remains provisional; unresolved electives/NSTP/track mappings are inactive. Weekly timetable and CSV/PDF behavior below remain requirements, not completion claims. See [implementation status](DEVELOPMENT-STATUS.md) and [setup/contracts](ACADEMIC-SETUP.md).

## Confirmed direction

- Subjects are predetermined. Registrars select approved catalog entries and cannot create subjects, change credits or create instructors.
- Every assignable instructor has an existing account. Administrators provision and activate accounts; registrars only allocate active instructors.
- Lecture and lab may have different instructor accounts, but remain linked to the same parent subject offering and class section.
- The supplied catalog is treated as BSIT. All three tracks are available as choices, with one selected per class section; elective placeholders must resolve to approved track subjects rather than being counted twice. Official curriculum version and elective-slot mapping still need confirmation.
- Instructors have view-only access to their assignments and published schedules. Registrars control allocation, room/time changes and publication. Administrator privileges and multiple-role behavior must be enforced explicitly, not inferred from any authenticated session.
- Registrars enter start/end times. Do not derive meeting duration, weekly contact hours or teaching workload from academic units.

## Required class schedule fields

The user requires class code, course, units, subject name, and year level alongside the existing room, instructor, date/time and class size. Class size is student headcount; it is separate from academic units and year level.

| Field | Proposed meaning and validation |
| --- | --- |
| `class_code` | Class offering/section identifier, stored as text with leading zeros intact. Separate from `subject_code`, a booking ID and a room ID; repeated meetings may share it. Confirm the department's naming convention. |
| `course` | Degree program, initially BSIT, chosen from the curriculum rather than free text. |
| `subject_code` | Approved component code, such as ITCC41 for lecture or ITCC41A for its lab. Resolve to an immutable catalog/component ID; preserve source codes and reviewed aliases. |
| `units` | Read-only displayed component credits: the main subject row has its catalog credits, while a lab row has 0 additional credits. The linked parent subject retains its credits and is counted once per offering, regardless of the number of meetings. Unknown values are not zero. |
| `subject_name` | Read-only title from the selected catalog subject/component. Registrars and imports cannot create or rename it. |
| `year_level` | Program year of the class section; validate against the approved curriculum placement where specified. Track table placement and irregular-class exceptions are not supplied and must not be inferred. |
| `component` | Explicit lecture/main or lab component from the catalog. A lab has its own component code and meeting, and a required parent-subject link. |
| `instructor_code` | Staff-facing institutional instructor identifier resolving to an active profile linked to an existing Auth account. Not a free-text name and not an exported Auth user ID. |

Illustrative allocation: class code `00123`, BSIT year 1, subject ITCC41 Computer Programming 1, 3 credits; main component ITCC41 and lab component ITCC41A. Lab display reads Lab — Computer Programming 1 and 0 additional credits. Each component has independently chosen room/time and an active assigned instructor. This example does not establish semester dates or contact hours.

## Roles and instructor accounts

| Actor | Allowed | Not allowed |
| --- | --- | --- |
| Administrator | Provision/activate/deactivate instructor accounts and assign explicit roles; load reviewed curriculum versions through controlled seed/admin operations. | Silently replace historical curriculum data or delete linked history. Scheduling authority requires an explicit registrar role if roles are combined. |
| Registrar | View approved subjects, choose offerings/sections/components, allocate existing active instructors and rooms/times, review imports, publish/unpublish. | Create instructor records or accounts, grant roles, edit subject definitions/units, or auto-create missing subjects/instructors through imports. |
| Instructor | Sign in, view own allocations including own drafts, and view published schedules. | Change room/time, publish, edit another instructor's private allocations, view private contact information of colleagues, or promote their role. |
| Public visitor | View/export permitted published schedule information. | View drafts/private contacts or perform scheduling/account/catalog writes. |

The instructor profile must reference an existing Auth user with a uniqueness constraint. Recommended allocation eligibility is active profile plus activated/confirmed account; pending invitations and deactivated profiles are not assignable. Draft import staging may flag an unresolved instructor, but saving an instructor allocation and publishing a class require a resolved active account-backed instructor. An unallocated draft offering may exist separately for review; it must not be presented as an assigned meeting. Do not create placeholder instructors or accounts to make an import succeed.

Preserve historical links when an instructor is deactivated. Retain past published allocations, flag future affected allocations for registrar reassignment, and reject new assignments/publication to inactive instructors. Do not cascade-delete schedule history. Administrator account provisioning is separate from creating an instructor through the registrar workspace; no registrar Add instructor action remains in the target design.

## Subject offerings and lab meetings

Recommended structure: curriculum version → approved subject → schedulable components; academic term/class section → subject offering → instructor allocations and room/time meetings for each component. Track and year belong to the section/curriculum placement, not a guessed value attached to a subject title. Keep lecture and lab joined by the offering so an unrelated lab cannot be paired accidentally.

Recommended offering identity is the resolved tuple of curriculum version, academic term, section, parent subject and class code. Give it an immutable internal offering ID and a database uniqueness constraint over that tuple. Lecture and lab codes resolve to the same parent before grouping, so separate component codes and repeated dates do not create duplicate offerings or duplicate credits. Re-imports resolve the same tuple; an explicit reviewed operation may create a missing draft offering, but never a missing subject, section, term or instructor. Confirm the department's class-code convention before finalizing this key.

The supplied lab entries carry zero additional credits but real scheduled time. Their component codes and parent relationships must be explicit database links, not runtime guesses based only on an A suffix. Allow several dated meetings for the same component without adding academic credits repeatedly. A lab must satisfy a verified lab-room requirement when one exists; do not assume every lab requires computers or deduce room capabilities from an illustrative name. If room suitability is unknown, flag it for review.

Recommended conflict rules for this expanded model: reject overlapping published meetings for the same room or the same instructor, including across rooms and lecture/lab components. Permit back-to-back meetings. Decide whether all students of a section attend together or use lab subgroups before enforcing section conflicts; subgroup capacity, split labs and cross-year attendance remain open. Do not assume two classes conflict merely because their program/year match.

## Forms and weekly timetable

In the in-workspace form, select term, class section, approved subject and component, then an existing active instructor and room/time. Program, title, units and known curriculum placement populate from the selection and are read-only to registrars. Unknown accounts/catalog matches block resolution instead of opening a creation dialog. Use class code and subject name as the compact timetable block heading; distinguish Lab visibly. Show program, year level, credits/component relationship, instructor and time in expanded details and the mobile agenda.

Public published class schedules may expose these academic details through an explicit safe projection. Full draft access is registrar-only; instructors see only their own assigned drafts. Catalog/account checks do not replace time and capacity validation. Instructor and student-cohort conflict rules are separate from display metadata.

## CSV and PDF

Use the same field names in the [CSV format](IMPORT-EXPORT.md#csv-version-1) and normalized PDF extraction model. Resolve subject/component codes and instructor identifiers to existing approved records. Titles/units are output or consistency-check fields, never permission to create catalog rows. Unknown subjects/instructors and conflicting provided metadata remain review errors. Preserve text codes, derive credits from catalog links, and do not infer units or year from names.

CSV exports retain these fields on published class rows. PDF timetable blocks prioritize readability; a report detail table or appendix carries all five fields when they do not fit in the grid. PDF reports use explicit labels for Class code, Course, Units, Subject and Year level. Units belong to the subject; repeated meetings must not multiply reported academic credits. Do not calculate semester-unit totals without a defined subject/offering grouping rule.

## Database compatibility and migration

The earlier snapshot-only recommendation is superseded by the fixed-catalog requirement. Add a versioned catalog and explicit component/parent links, account-backed instructor profiles, per-role access, sections/offerings and allocations through reviewed migrations. Meetings reference approved offerings/components; preserve historical metadata through an immutable curriculum version or controlled snapshots, not mutable registrar text. A full catalog-management UI is not required initially; use reviewed administrator seed operations.

Existing bookings contain a generic `title` and may reference free-standing instructor records without accounts. Preserve legacy records for review; do not create subjects or Auth accounts by matching names automatically. Require explicit mapping to a subject/component and an eligible instructor before a class is republished under the new model. Non-teaching activities may retain their separate title and workflow without invented academic fields.

Broad staff write policies and registrar instructor creation have been replaced with role-specific policies, constraints and server actions. Public projections and authorized reads include canonical academic fields; SMS continues to resolve the selected profile. File exchange remains planned and must reuse these boundaries. The dedicated academic role-context tests provide the current database evidence.

## Acceptance

- Registrar subject and instructor creation attempts fail through direct requests as well as the UI; only existing approved subjects/components and eligible account-backed instructors can be assigned.
- An administrator-provisioned instructor can sign in and read only their own private allocations plus published schedules; registrars retain scheduling control.
- Lecture and lab for one offering may use different instructors and rooms; each component remains tied to the parent, and parent credits count once. An unrelated lab component cannot be attached.
- CSV round trips preserve codes, links and read-only catalog values. Unknown subject/instructor codes, altered credits, mismatched components and invalid years produce explicit review errors.
- Published room and instructor overlaps are rejected atomically; deactivated/invited-only instructors cannot receive new allocations. Past history remains readable.
- Weekly timetable, agenda, room details and designed PDF reports expose the academic details readably; no incorrect unit totals appear for repeated meetings.
- Public responses contain permitted academic fields only for published records; drafts/private instructor data remain protected.
- Legacy schedules and non-teaching activities remain readable without invented values, and the new publication rules have a documented migration path.
