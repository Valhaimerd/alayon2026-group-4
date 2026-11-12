# CISC SchedFlow

## Proposed classroom scheduling and building map

CISC SchedFlow is a progressive web app for managing classroom schedules and finding room availability in one academic building. Department staff maintain room and class information, check for conflicts, and publish schedules. Anyone can consult published schedules and a two-dimensional floor map. The map remains the main workspace. The original five-hour demo scope has expanded to CSV/PDF exchange; the revised deadline is open. Detailed departmental permissions and policies still need confirmation.

## Problem and objectives

The proposal aims to make classroom use easier to see and reduce timetable conflicts. It should provide a shared view of room availability, distinguish class and examination bookings, and help staff assign rooms that meet capacity and usage needs. The current scheduling process and its problems still need to be confirmed with department staff.

## Recommended first release

- Manage one building, its floors, rooms, capacities, and permitted uses.
- Let authorized staff create and edit class and examination bookings with course or activity, room, date or recurrence, time, and responsible person.
- Class schedules must also store and display class code, course, academic units, full subject name, and year level as separate fields. Their definitions, validation, legacy handling and file mappings are specified in [academic schedule details](SCHEDULE-DATA.md).
- Select subjects/components from the predetermined [curriculum catalog](SUBJECT-CATALOG.md); do not offer subject creation or editable credits to registrars. Schedule labs separately with explicit parent-subject links and zero additional credits.
- Allocate only existing active account-backed instructors. Administrators provision accounts; registrars cannot create instructor profiles or accounts. Lecture and lab may have different instructors. Instructors view their own allocations and published schedules without editing them.
- Block overlapping published bookings in the same room while allowing back-to-back bookings. Block publication when class size exceeds room capacity; confirm whether overrides are needed. Flag room-use mismatches.
- Support weekly classes within an academic term and one-time bookings for exams; defer complex recurrence exceptions.
- Default to the selected room's full weekly timetable, with optional specific-date/time availability checks, plus a clickable 2D floor map where a floor plan is available.
- Let department staff create, review, and publish schedules; anyone can view published information without signing in.
- Provide a responsive, installable PWA. Cache the app shell; show an offline state and avoid promising offline schedule access until its freshness and privacy rules are defined.
- Import and export CSV schedules and import/export PDF schedules through the shared map workspace. Imports require room mapping, validation, editable review, and draft saving before publication. Exported PDFs use a designed report layout rather than an app screenshot. See [import/export scope and acceptance](IMPORT-EXPORT.md).

Acceptance details, roles, schedule rules, and actual floor plans require confirmation before implementation.

## Interface direction

The building floor plan is the main workspace, presented as a free-form canvas. Users can pan around it and zoom in or out; selecting a room opens its schedule and details without navigating away. On desktop, a left sidebar contains floor, week, search, and optional availability controls, while an expandable right panel displays the selected room's weekly timetable. Staff actions appear only to authorized staff. On mobile, collapse filters and show room details in a bottom sheet so the map remains usable. Include visible zoom and reset controls, room labels, and a searchable keyboard-accessible room list. Availability must not rely on color alone. Panning and zooming do not imply that users can edit the floor plan itself.

### Weekly schedule as the default

Confirmed direction: selecting a room shows its full Monday–Sunday timetable in an expandable right panel. The map remains visible on desktop. The weekly timetable is the default; the user does not need to choose a particular time to see classes. Provide Previous week, This week, and Next week controls and a week/date picker with an explicit date range, all interpreted in Asia/Manila.

Place weekdays and dates across the timetable and times vertically. Class blocks prioritize class code, subject name and start/end; expanded details show course, units, year level and instructor. Activity blocks retain their title. Show staff-only draft state when enabled. Selecting a block opens its details or authorized editing controls. Include every booking in the selected week; weekends and bookings outside the initial visible hour range must remain discoverable. Provide a keyboard-accessible agenda alternative and a mobile week summary with day navigation instead of squeezing seven unreadable columns into a phone.

In the default map mode, use weekly summaries such as 3 published bookings or No published bookings this week. Do not label a partly scheduled room Occupied for the whole week, or imply No bookings means institutional permission to use it. Unknown/loading data is never shown as free. An optional Check a time control reveals date/time fields for instantaneous Available/Occupied checks; changing that check does not remove other classes from the weekly timetable. Date-only/day detail is optional, not the landing state.

Weekly display and recurring booking creation are separate features. The weekly grid initially renders existing dated occurrences. A class repeats across weeks only when actual dated bookings or an explicitly implemented recurrence model exists. Recommended booking behavior: select a free timetable slot to prefill the room, date and start time, then choose the end time and validate normally.

### Single-page workspace

Registrar schedule work happens on the building explorer page: sign in, choose approved subjects/components and existing instructors, create/edit/publish/unpublish meetings, and review notifications without leaving the map. Public visitors and registrars share the explorer, with role-specific controls. Instructor account provisioning is an administrator operation outside the registrar workflow.

- **Top bar:** Staff sign in opens a dialog over the map. When signed in, show the staff state, a notifications control that opens a popover listing failed or pending instructor notices with Retry, and Sign out.
- **Left sidebar:** floor, selected week, search, and optional Check a time controls. Staff also see a Show drafts toggle that includes unpublished bookings in their view, and a Rooms / Bookings switch. Weekly summaries distinguish drafts from published bookings.
- **Right panel:** the selected room's expandable weekly timetable. Staff see Edit, Publish, and Unpublish on each booking, draft labels, and a New booking button. The booking form opens inside this panel, prefilled with the room and any explicitly selected timetable slot. Saving returns to the same room and week and updates the map. Preserve the user's canvas position.
- **Subject and instructor selection:** searchable approved subject/component and existing active instructor lists. No Add subject or Add instructor control for registrars. Subject name/credits are derived read-only; missing account/catalog matches need administrator resolution.
- **Mobile:** the room bottom sheet holds the schedule and expands to show the booking form. Sign-in and selection dialogs remain full-screen-friendly.
- **File toolbar:** Import and Export remain accessible while exploring the building. Import opens a large review dialog/drawer with column and room mapping, row/page errors, duplicate/conflict checks, and Save drafts. Selecting a row highlights its room. Export selects room/floor/building, date range, and CSV or PDF format. Public visitors can export published information; imports and draft exports require staff access. Mobile review uses a full-screen dialog.

Forms must not be placed in a bottom bar on desktop, because it reduces map space. All access is still enforced on the server and by database policies; hiding controls is not the security boundary.

Drag empty canvas space to pan; use zoom buttons, mouse wheel, or pinch to zoom, and provide a Fit building control. Use weekly booking summaries by default and time-specific status only when Check a time is enabled. Show Unavailable only for an explicitly defined room restriction. Use clearly labeled demo data if verified building data is unavailable.

## Later capabilities

- Suggest room assignments from capacity, usage, availability, and scheduling constraints, with staff review before publication.
- CSV/PDF exchange is now part of the expanded release. Implement CSV first, designed PDF reports second, and supported PDF schedule extraction with correction next. Scanned documents need an explicit OCR/provider decision; arbitrary PDF compatibility is not promised.
- Explore optional provider-backed extraction or room-mapping assistance after file review works. Provider and budget remain open. Staff must review AI output; it must not silently publish schedules.
- Consider external APIs, multiple buildings or institutions, and configurable branding when there is a concrete need.

## Platform and architecture

See [Architecture and technology plan](ARCHITECTURE.md) for the stack, boundaries, deployment, and verification details.

- **Next.js and React:** application interface and server-side operations, hosted on Vercel.
- **Supabase:** PostgreSQL, authentication, and controlled data access. Schema changes and policies are maintained as reviewed migrations.
- **PWA:** web app manifest and service worker for installation and an explicitly defined offline experience; browser support varies.
- **Building map:** start with an accessible SVG floor plan and a list-based alternative; select other libraries only when needed.
- **HaturikoSMS:** notify the assigned instructor when a published room or time changes. The sender, consent flag, outbox, and failure status are implemented; sending is disabled by default and delivery remains unverified.
- **Scheduling and AI:** choose libraries or a separate service only after requirements and deployment constraints are established. The previous Laravel, Vue, Python, RAG, and OR-Tools stack is not a committed implementation.

## Initial data concepts

Building, floor, room, room use, academic term, course or activity, schedule, user or role, and publication status are candidates, not an approved schema. Confirm recurrence, room ownership, personal information, and exam rules before defining tables.

## Privacy and access

Limit access by role, protect personal information, and define retention and permissions with the department. Keep service credentials server-side. Review public display and offline caching of schedule details before release.

## Questions for the department

1. Which registrar accounts may approve schedules, and can any administrator also hold a registrar role?
2. Which building and rooms are in scope, and are usable floor plans and room capacities available?
3. What are the scheduling rules for classes versus exams, recurrence, lab subgroups, room suitability and exceptions? Start/end times are registrar-entered; prescribed contact hours are not supplied.
4. Which assignment constraints are essential, and should non-AI assignment suggestions be included if time permits? Recommendation: deliver conflict-checked manual scheduling first.
5. Which CSV/PDF layouts must be supported, are the PDFs scanned, and what sample files and official report branding are available?
6. How will administrator-provisioned instructor profiles collect phone numbers and consent, and what SMS budget and failure process are available?
7. What must work offline, and may schedule data be stored on shared devices?
8. What is the revised deadline and how will the expanded release be evaluated?

## Delivery approach

Continue from the scheduling baseline into the shared map workspace and file-exchange milestones. See the [delivery plan](PLAN.md) for order and the [import/export plan](IMPORT-EXPORT.md) for proposed defaults and acceptance criteria.
