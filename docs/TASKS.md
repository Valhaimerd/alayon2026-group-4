# Implementation tasks

This is the working backlog for the expanded competition build. Read the [proposal](CLASS-SCHED-PROPOSAL.md), [architecture](ARCHITECTURE.md), and [delivery milestones](PLAN.md) first. Record actual results and limitations. CSV/PDF work is planned in tasks 8–11; optional AI is task 12. Tasks 14–16 now define fixed subjects, account-backed instructors and lecture/lab allocation, superseding free-text academic fields and registrar instructor creation. A task is done only when its acceptance checks pass. Do not mark planned behavior as implemented.

## Current execution summary

Map, public schedule view, staff screens, database policies and constraints, PWA foundation, and notification integration are implemented. Phase 3's local staff access and Phase 4's same-day booking workflow are verified; see [development status](DEVELOPMENT-STATUS.md) for evidence. Production environment configuration, device pinch/install/update checks, simultaneous browser-tab submissions, and SMS delivery remain unverified. The initial implementation was pushed to `main`; the workspace wizard, welcome integration and verification evidence are included in the current source tree.

## Working assumptions

- One building and one floor initially. Use clearly labeled demo rooms and schedules until real data is verified. Another chat is preparing room assets; inspect and coordinate before editing those files.
- Anyone may view published schedules. Registrars manage allocations; administrators provision instructor accounts and approved catalog versions; instructors view their own allocations and published schedules. New role restrictions require tasks 14–16 and are not covered by legacy staff tests.
- Times use Asia/Manila. Store unambiguous timestamps and display local times; confirm term dates. Start with one-time bookings, then weekly recurrence if time permits.
- Published bookings cannot overlap in the same room; adjacent bookings are allowed. Capacity excess blocks publication. Confirm room-use rules and overrides before treating them as department policy.
- SMS and AI must not block a usable map and scheduling demo. Do not send real SMS during testing.

## 1. Map workspace

**Status:** ready after coordination with the room asset work. **Depends on:** usable map assets or labeled demo data.

- [ ] Inspect the generated room assets and identify stable room IDs; avoid overwriting concurrent changes.
- [ ] Display the building as the primary canvas with floor selection, pan by dragging empty space, wheel/pinch and button zoom, and Fit building.
- [ ] Make rooms selectable; provide labels, a searchable keyboard-accessible list, and an alternative to color for availability. Do not imply that the canvas edits the building.
- [ ] Connect selected room to the details panel; adapt filters and details to mobile.

**Acceptance:** room selection works by pointer and keyboard; panning does not accidentally select rooms; zoom and Fit building recover the whole floor; room names and availability are readable without color; mobile controls remain usable. Verify in a real browser at desktop and mobile sizes with mouse, touch emulation and keyboard. Record which data is illustrative.

## 2. Room details and public schedule

**Status:** daily view baseline exists; weekly default expansion is planned in task 13. **Depends on:** stable room IDs from task 1.

- [ ] Show selected room name, type, capacity, and full weekly published timetable in an expandable desktop side panel or mobile bottom sheet.
- [ ] Add week navigation and weekly booking summaries by default; keep instantaneous date/time checks optional. Provide loading, empty, and error states. Until an unavailability rule is agreed, use unavailable only for explicitly unavailable rooms, not missing data.
- [ ] Replace demo schedule data with the public read path from task 3 without exposing drafts, phone numbers, or staff-only fields.

**Acceptance:** changing week or room updates the complete weekly timetable and summary; optional time checks do not hide the week's classes; no selection and no bookings have understandable states; a failed request is not presented as availability. Verify with sample bookings across days, an empty week, and a simulated failure; check keyboard and mobile interaction.

## 3. Supabase data and staff access

**Status:** local access verified; production environment and integration settings still need confirmation. **Depends on:** confirmed project target; coordinate room IDs with task 1.

- [ ] Confirm the Supabase project and whether GitHub migrations deploy to production. Keep preview writes away from production. Use local/test data where practical.
- [x] Define the smallest room, booking, and staff authorization model needed for one-time bookings. Store draft/published state, capacity, room, activity, start/end, and staff ownership or role as needed. Agree how the initial staff account is provisioned without enabling public self-promotion.
- [x] Create reviewed migration(s) and row-level security policies. Public reads expose only published schedule fields; unauthenticated and non-staff users cannot write or read private instructor contact data.
- [x] Add server-side Supabase configuration and staff sign-in; keep privileged credentials server-side. Preserve existing environment values and document required names without values.

**Acceptance:** public reads return published records only; unauthorized writes and draft/private reads fail; an authorized staff member can sign in and write permitted data. Test policies against anonymous, non-staff, and staff contexts, and verify migration application and rollback strategy on a nonproduction target where available. Record deployment status.

## 4. Create and publish a booking

**Status:** verified for the earlier local same-day, one-time booking baseline. Fixed-catalog and account-backed allocations require tasks 14–16; earlier instructor creation is no longer the target behavior. The legacy five-step workspace wizard also supports bounded weekly series creation; editing remains per occurrence. **Depends on:** tasks 2 and 3.

- [x] Provide a staff-only form to create and edit a one-time class or exam with room, activity, start/end, class size, and instructor information needed for the demo.
- [x] Validate required fields, end after start, room capacity, and overlapping published bookings; allow an end time equal to another booking's start. Enforce conflict protection in the database or an equivalent atomic transaction, not just the browser.
- [x] Publish valid bookings and make them appear in the public room view. Display actionable validation, loading, and failure states. Preserve drafts if the chosen model supports them.
- [x] Create bounded weekly series with per-weekday times and atomic conflict checks across every occurrence. Maximum 150 dated bookings; no series-wide edit/delete or recurrence-rule storage.

**Acceptance:** a valid booking survives refresh and appears publicly only after publication; an over-capacity or overlapping booking cannot be published; adjacent bookings can; concurrent attempts cannot both create conflicting published bookings. Test invalid input, anonymous access, refresh, adjacent/overlapping times, and concurrent submissions. Do not claim recurring support until tested.

## 4a. Move staff management into the workspace

**Status:** legacy workspace and wizard implemented locally; catalog, account roles and remaining mobile/keyboard acceptance require further work. **Depends on:** tasks 1–4. See the [single-page workspace](CLASS-SCHED-PROPOSAL.md#single-page-workspace) layout and [decision](DECISIONS.md#single-page-workspace).

- [ ] Determine the session and staff membership on the server for `/explore` and pass staff-only data (drafts, instructors, notifications) to the workspace only for authorized staff.
- [ ] Replace the `/staff` sign-in page with a sign-in dialog in the top bar; show staff state, notifications popover with Retry, and Sign out when signed in.
- [ ] Add Show drafts and a Rooms / Bookings switch to the left sidebar for staff.
- [ ] Show staff booking actions (Edit, Publish, Unpublish, New booking) in the right panel, with the booking form opening in that panel and prefilled from the selected room, date, and time.
- [ ] Select an existing active instructor account from the booking form. Do not expose Add instructor to registrars; task 15 replaces the earlier creation dialog requirement.
- [ ] Use the expanding bottom sheet for the schedule and form on mobile.
- [ ] Reuse the existing server actions; redirect `/staff` to `/explore?signin=1`; `/` serves the welcome page.

**Acceptance:** a registrar can sign in, select approved subjects/components and existing instructors, create/edit/publish/unpublish, and retry a notice within the explorer; no registrar subject/instructor creation path exists. Public visitors receive no draft/private data; instructor accounts receive only their own private allocations plus published records. Server and database authorization reject prohibited writes. Verify at desktop/mobile sizes with pointer and keyboard, including focus handling in dialogs.

## 5. PWA foundation

**Status:** ready; coordinate app-shell changes with task 1. **Depends on:** an application shell to cache.

- [ ] Add manifest, app name, appropriate icons, and a service worker using the smallest suitable approach.
- [ ] Cache only the intended application shell and show a clear offline state. Do not cache private data or queue offline writes by default.
- [ ] Verify install and update behavior on supported target browsers; document browser-specific limitations.

**Acceptance:** manifest and icons load, the app offers installation where supported, and an offline visit shows an understandable state without exposing private data or pretending a booking was saved. Test online, offline, and after an update in a real browser.

## 6. Instructor SMS

**Status:** sender prepared; integration blocked on tasks 3–4 and recipient consent/data. **Depends on:** published schedule changes, instructor phone number and consent, test credentials.

- [ ] On a published room or time change, create a uniquely identified notification for the assigned consenting instructor after publication succeeds. Do not notify for a draft or an unchanged room/time.
- [ ] Use the existing server-only `sendScheduleChange` in `lib/sms.ts`, with a stable event ID for idempotency. Record the provider message ID or failure; an accepted request means queued, not delivered.
- [ ] Surface failed notification status to staff without undoing the published schedule. Do not automatically retry indefinitely. Define safe recovery before adding retries.

**Acceptance:** a qualifying change queues one notice for the correct instructor; unchanged/draft changes do not; provider failure leaves publication intact and visible as a failure. Test with mocks and a provider test key, never a live recipient during automated tests. The existing test command is `node --conditions=react-server --test tests/sms.test.mjs`.

## 7. Final verification and demo

**Status:** pending. **Depends on:** completed release tasks.

- [ ] Run `npm run lint`, `npm run build`, and relevant tests; record failures and resolve or disclose them.
- [ ] Walk through public map → room → schedule and, on the same page, staff sign-in → create → publish → public view. Exercise conflict, permissions, loading/error, mobile, keyboard, PWA, and SMS failure paths that were implemented.
- [ ] Verify the intended Vercel deployment and Supabase migration target. Label sample data and record missing features, known limitations, and any unverified integration.

**Acceptance:** the demo has a working map and at least one honest end-to-end scheduling path, or clearly identifies any unfinished part. Do not represent mock data, queued messages, or an unverified deployment as live functionality.

## Expanded file exchange tasks

The following tasks are planned, not implemented. The [import/export specification](IMPORT-EXPORT.md) owns formats, limits, permissions, and common validation. Coordinate with the ongoing single-page workspace refactor before editing its components. Prioritize task 13's weekly workspace before wiring export defaults to it. Complete release task 7 again for these features when they are ready.

## 8. CSV template and complete schedule export

**Status:** ready to plan against current code. **Depends on:** public/role-aware read paths, the shared workspace toolbar, and tasks 14–16's catalog/account-backed allocations.

- [ ] Implement the documented version 1 CSV header and a staff template download; keep public exports limited to published fields.
- [ ] Add format/scope controls for room, floor/building and date range. Fetch all matching records with deterministic pagination; authorize draft export on the server.
- [ ] Handle quoting, Unicode, delimiters, multiline values and spreadsheet-formula prefixes using verified parser/writer behavior. Document normalization used for safe round trips.
- [ ] Add download, empty-scope and failure states without covering the map permanently.

**Acceptance:** tests cover public draft/private-field exclusion, parameter tampering, more than one response page, quoting/Unicode/formula-like text, and a staff export/template fixture suitable for task 9. Verify downloads on desktop and mobile; no phone numbers, consent or account identifiers are exported.

## 9. CSV import, room mapping and draft application

**Status:** planned. **Depends on:** task 8's format, staff authorization, reviewed batch/provenance migration design.

- [ ] Parse bounded files into the shared normalized row model. Build upload, column mapping, room matching, correction and review steps with source-row errors. Retain entered corrections on failure.
- [ ] Highlight mapped rooms when selecting rows. Require staff resolution of unknown rooms and ambiguous dates. Detect within-file and existing-data duplicates/conflicts without modifying floor geometry.
- [ ] Create an authorized transactional draft commit with batch idempotency and private provenance. Revalidate server-side, handle concurrent changes, and save all selected rows or none.
- [ ] Default to create-only drafts; explicit update mode may modify drafts with a before/after preview. Block updates to published rows through this importer; never infer deletion from missing rows. Refresh staff room counts and drafts after save.

**Acceptance:** valid rows reach the correct rooms; public users cannot import or see drafts; double submission/retry cannot duplicate rows; malformed/oversized files, unknown rooms, capacity excess, ambiguous dates and conflicts produce source-row feedback. Inject a transaction failure and confirm zero partial writes. Test a reviewed staff export round trip, a published-ID update attempt, and zero import-triggered SMS sends.

## 10. Designed PDF schedule export

**Status:** planned. **Depends on:** task 8's authorized, complete export query and agreed report content.

- [ ] Select a supported PDF generation approach after checking runtime constraints and available dependencies. Add the PDF format to the same export dialog.
- [ ] Implement A4 landscape room/week timetable and date-range table report with scope, timezone, branding, generated time, legend, draft watermark where appropriate, page numbers and repeated headers.
- [ ] Keep text selectable, wrap long content, and use controlled pagination. Verify metadata and accessibility support of the chosen implementation. A floor-plan appendix is optional after readable schedule pages work.

**Acceptance:** report rows match the CSV query scope; public exports exclude drafts/private fields; inspect every rendered page for long titles, Unicode, empty and multi-page schedules. Check readable fonts, headers and page breaks and verify mobile download. Record supported report layouts and accessibility limitations.

## 11. PDF schedule import and correction

**Status:** planned; needs representative PDFs before claiming format compatibility. **Depends on:** task 9's shared review/commit pipeline.

- [ ] Collect samples and define supported text-table layouts; implement extraction with source-page references and file/page limits. Reuse the normalized row model, room mapper, validation, and draft commit.
- [ ] Show missing/uncertain cells for correction; never invent times, room mappings, or class size. Unsupported or empty extraction must not save anything.
- [ ] Detect encrypted, malformed and image-only PDFs. Show an explicit outcome; if scanned input is required, choose and test OCR or a provider-assisted path before advertising support.
- [ ] Include a sample app-generated report in round-trip tests, while recommending CSV for exact structured exchange.

**Acceptance:** each supported fixture reaches a correctable preview with page provenance and saves validated drafts only after confirmation. Unsupported/scanned fixtures are identified clearly. Authorization, atomicity, duplicates, limits and conflicts behave identically to CSV; no PDF upload publishes or sends SMS automatically.

## 12. Optional provider-backed AI assistance

**Status:** optional, provider not chosen. **Depends on:** tasks 9 and 11, provider/data-handling/budget decisions.

- [ ] Choose one narrowly scoped use: suggest structured PDF rows or room/column mappings. Define cost limits, timeout/error handling and a manual fallback before integration.
- [ ] Keep the provider key server-side. Require an explicit processing action and disclose what document content is sent; treat file text as data, not instructions.
- [ ] Validate suggestions against the same schema, show provenance and uncertainty, and require staff review. Do not give the model database mutation or publication authority.

**Acceptance:** invalid, unavailable, slow and misleading provider outputs cannot bypass booking rules or publish changes; manual CSV and supported PDF workflows still work without the provider. Record actual provider cost/latency findings before enabling broad use.

## 13. Weekly room timetable as the default

**Status:** planned, user-confirmed interface direction. **Priority:** next workspace milestone, before dependent file scope UI. **Depends on:** current room selection and authorized schedule reads; coordinate with active explorer refactor.

- [ ] Normalize the selected week to Monday in Asia/Manila. Add Previous week, This week, Next week and a week/date picker with explicit range. Read all seven days with stable pagination, including Sunday and month/year crossings.
- [ ] Replace the date-only room list with an expandable Monday–Sunday time-grid panel. Keep the map visible on desktop and the current room/canvas position across week navigation, expansion and saving. Show all published booking blocks; include private draft blocks only for authorized staff with drafts enabled. Overlapping drafts must remain individually selectable.
- [ ] Use weekly map summaries by default. Move Available/Occupied at a particular moment into optional Check a time controls; choosing a time must not hide any bookings from the weekly schedule. Render unknown/loading/error states explicitly.
- [ ] Include accessible agenda navigation and a mobile week summary with day tabs. Keep weekends and out-of-hours classes discoverable. Support slot selection to prefill staff booking room/date/start; use the existing same-day validation and explicit end time.
- [ ] Default CSV/PDF export to the selected room/week, with visible scope overrides. Weekly display must not generate recurring bookings or duplicate occurrences.

**Acceptance:** fixture bookings on Monday, Sunday, and across month/year boundaries appear in the correct week. The last instant of Sunday is included; next Monday belongs to the next week. Changing time-check mode never truncates the timetable or export scope. Failed/partial loads never show a room as free. Verify draft privacy, overlapping draft access, room/week/canvas persistence, keyboard navigation, mobile readability, empty weeks, and sufficient panel width without replacing the map.

## 14. Fixed curriculum and academic schedule details

**Status:** planned, user-required fixed catalog. **Priority:** before CSV/PDF class import; coordinate with tasks 13, 15 and 16 and active explorer work. **Depends on:** existing bookings and a verified curriculum version. Read [academic schedule details](SCHEDULE-DATA.md) and the [catalog transcription](SUBJECT-CATALOG.md).

- [ ] Verify the 113 source entries, 38 proposed lab links and per-section credit totals. Confirm official BSIT curriculum version, elective substitutions, NSTP alternatives and add101; leave unresolved placeholders inactive.
- [ ] Add reviewed catalog/component migrations and controlled, repeatable administrator seed operations. Store immutable IDs, source codes, titles, credits and placement/track data; labs reference a parent subject explicitly and have zero additional credits.
- [ ] Make subject/component selection catalog-backed and names/units read-only to registrars. Reject catalog writes by registrar/instructor/public roles at the database and server boundaries, not only in the UI.
- [ ] Preserve legacy titles and unlinked records without inventing subjects or accounts; require explicit mapping before later class publication. Keep non-teaching activity handling distinct.
- [ ] Extend safe read projections and shared CSV/PDF/timetable metadata. Preserve codes with leading zeros and explicit aliases; never sum subject credits per meeting or count track replacements twice.

**Acceptance:** only approved catalog selections resolve; altered posted title/units cannot rewrite subject definitions; invalid parent links fail; 0-credit labs remain schedulable without adding subject credits. Registrar catalog creation is denied through direct API calls. Verify seed idempotency, inactive placeholders, source totals and code-alias ambiguity. File round-trip checks complete only when tasks 8–11 exist.

## 15. Account-backed instructors and role boundaries

**Status:** planned, confirmed ownership model. **Depends on:** existing Supabase Auth and reviewed role migration design.

- [ ] Define explicit administrator, registrar and instructor roles. Migrate the existing privileged staff account only after confirming its intended roles; do not turn every authenticated user or legacy instructor name into staff.
- [ ] Provision/activate instructor accounts through administrator-controlled Auth operations. Require a unique Auth-user link in profiles, an institutional allocation identifier and eligibility state. Pending invitations and inactive accounts cannot receive new allocations.
- [ ] Remove registrar Add instructor controls and instructor/account creation mutations. Replace broad staff policies with role-specific reads/writes; direct inserts and role self-promotion must fail. Limit registrar contact access to what the workflow needs.
- [ ] Give instructors view-only access to their own private allocations and public schedules. Separate instructor login behavior from registrar controls; do not deny all instructor access just because the account has no registrar membership.
- [ ] Preserve historical assignments on deactivation; flag future affected assignments for reassignment without deleting history. Resolve existing standalone instructor rows explicitly. Decide profile contact/consent editing authority before adding that flow.

**Acceptance:** administrator-provisioned instructor signs in; registrar selects the account but cannot create one through UI or direct requests; non-instructors cannot be assigned; inactive/invited-only accounts fail eligibility checks. Instructors cannot mutate schedules or read colleagues' drafts/private contacts. Test explicit combined roles, role removal, account deactivation and historical access with real role contexts. No credentials or Auth IDs are exported in exchange files.

## 16. Subject offerings and lecture or lab allocation

**Status:** planned, required linkage and allocation workflow. **Depends on:** tasks 14–15, reviewed term/section data, and the map workspace.

- [ ] Represent academic term, class section/year/track and approved subject offering; attach component-level instructor assignments and room/time meetings. Use the documented unique offering tuple so lecture, lab and repeated occurrences share one offering and one credit count. Term/section creation authority must be explicit; file import cannot create these records silently.
- [ ] Let registrars select subject → lecture/main or linked lab → active instructor → suitable room and explicit start/end. Populate catalog name/units automatically; label labs with their parent subject. Different lecture/lab instructors are permitted.
- [ ] Reject mismatched subject/component/section links and ineligible instructors before publication. Atomically block published room and instructor overlaps across rooms/components while allowing adjacent meetings. Decide section/subgroup constraints before enforcing them.
- [ ] Render each component separately in weekly grid/agenda and reports; count parent subject credits once per offering. Track subjects substitute approved elective slots, not extra duplicated credits. Unresolved placeholders cannot be published.
- [ ] Reuse the same resolution/validation rules in CSV/PDF staging and SMS recipient lookup. New instructors/subjects are never created as import side effects. Distinguish class rows from non-teaching activities explicitly; activity imports must not require fabricated academic metadata or bypass class rules. Persist draft review state without presenting it as a published assignment.

**Acceptance:** one offering has lecture and lab in different rooms with different instructor accounts and correct credits; unrelated lab attachment fails. Same-instructor overlaps in different rooms fail under concurrent submissions; back-to-back meetings work. Staff selects times independently of units. Unknown imported codes/accounts are review errors. Verify instructor own-assignment visibility, registrar allocation rights, catalog-derived values and no automatic SMS from file review.
