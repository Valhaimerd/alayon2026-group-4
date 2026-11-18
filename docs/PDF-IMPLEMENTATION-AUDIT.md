# Initial implementation audit and remaining work

Audit date: 17 November 2026 (Asia/Manila). Repository baseline: `e181bc5`.

Track the remaining work in the [implementation checklist](PDF-IMPLEMENTATION-CHECKLIST.md).

Framework update, 18 November 2026: Laravel/React/Inertia now replaces the audited Next.js application. Findings below describe the original baseline; source links point to successor files where code moved. This conversion does not complete the missing PDF capabilities. Use [migration notes](LARAVEL-MIGRATION.md) for current architecture, commands and verification.

## Result

The project **partially follows the PDF's initial implementation scope**. It has a manual scheduling foundation: a two-floor map, daily room schedules, class creation/editing, draft/publication controls, authentication, role checks, and database protection against published room and instructor overlaps. It does not yet deliver the complete AI-assisted MVP described in the PDF. The largest gaps are room inventory management, weekly calendars, PDF/OCR processing, automated room assignment, examination rules, approval/version history, RAG, external integration APIs, institutional configuration, and audit logging.

This document records work to implement later. No application code, dependencies, database schema, deployment, or service settings were changed for this audit.

## Source and method

- Primary requirements: `C:\Users\USER\Downloads\CISC SchedFlow.pdf`, 16 pages, titled *CISC SchedFlow: An AI-Assisted Classroom Scheduling and Interactive 2D Building Visualization System*.
- Main baseline: section 6, **Scope**, on page 3. Supporting details: section 8 on pages 4–7, section 9 on pages 7–8, functional/non-functional requirements on pages 12–13, and success criteria on page 15. Page references below mean PDF page numbers.
- Inspected application routes/components, server actions, shared models/validation, all migration filenames and relevant SQL definitions, tests, CI configuration, and repository product/planning/status documents.
- Status means evidence in the checked-out source. An implemented feature is not a claim that the deployed application or connected database was verified.
- Missing means no implementation was found in this repository. An independently hosted service outside the repository was not investigated.
- No live database tests, SMS sends, deployment operations, browser sessions, or external account changes were performed.

## Important scope differences

The PDF and the newer repository plan describe different delivery scopes. The PDF explicitly includes OCR, AI interpretation, automated assignment, RAG, REST APIs, branding, and audit logging in the initial implementation. The [current proposal](CLASS-SCHED-PROPOSAL.md), [architecture](ARCHITECTURE.md), [product](PRODUCT.md), and [delivery plan](PLAN.md) defer several of these or make them optional. Consequently, following the repository backlog alone would still leave PDF requirements unmet.

The PDF proposes Vue/Laravel/FastAPI, FullCalendar, PyMuPDF/OCR, pgvector, and OR-Tools (pages 8–10). The repository deliberately uses Next.js 16.4.6, React 19.3.0, Supabase/PostgreSQL, native SVG, and Vercel. This is a documented architecture divergence, not a reason to rewrite the application. Preserve the existing stack; decide separately whether the proposal's named technologies are binding or equivalent implementations are acceptable. The missing capabilities remain gaps regardless of library choice.

CSV import/export, designed PDF export, SMS notifications, PWA behavior, and the detailed fixed BSIT curriculum are additions in the repository plan. They are useful, but do not substitute for PDF extraction, optimization, approval, RAG, or audit requirements. Multi-building operation, live occupant tracking, indoor positioning, and 3D visualization are not initial-release requirements in the PDF.

## Initial-scope traceability

**Implemented** = feature exists in source; **Partial** = part exists but the PDF requirement is incomplete; **Missing** = no source implementation found.

| PDF initial requirement (page 3) | Status | Evidence and remaining gap |
| --- | --- | --- |
| One academic building | Partial | A single building workspace exists. Building identity is implicit; there is no persisted building record or administrator building configuration. Room data needs authoritative validation. |
| Multiple floors | Implemented | Ground and second-floor references and floor selection exist in [workspace.tsx](../resources/js/explore/workspace.tsx) and [floor-plan assets](../public/floor-plans/README.md). |
| Classroom and room inventory management | Partial | Seeded room records and hardcoded geometry exist; create/update/archive management, complete metadata, and room restrictions are absent. See G1. |
| Interactive 2D floor maps | Implemented | SVG selection, pointer pan, wheel/button/pinch logic, Fit building, room list, labels, and mobile panels exist in [workspace.tsx](../resources/js/explore/workspace.tsx). Physical-device behavior was not reverified. |
| Classroom details and availability | Partial | Name, floor, type, normal capacity and daily schedules exist. Status is Scheduled / No bookings / Unknown for a date, not interval availability, reservations or maintenance restrictions. See G1/G2. |
| Daily and weekly schedule views | Partial | Daily schedule cards and one-day server reads exist. Weekly booking creation exists, but no full weekly calendar display. See G2. |
| Manual schedule creation and editing | Implemented | [BookingWizard](../resources/js/explore/staff-ui.tsx), [server actions](../app/Http/Controllers/BookingController.php), and the academic save RPC implement dated class/activity writes and edits. Weekly creation expands into independent occurrences. |
| PDF upload and schedule-data extraction | Missing | No document-upload workflow, storage integration, extraction worker, extracted-record model, or review/save path. See G5. |
| OCR for scanned documents | Missing | No OCR implementation. The newer plan's optional OCR does not fulfill the PDF's initial scope. See G5. |
| AI interpretation of extracted data | Missing | No model-provider integration, confidence/provenance model or assisted field-mapping workflow. See G5. |
| Automated classroom assignment | Missing | Staff choose rooms manually; capacity filtering and conflict rejection are not assignment generation or optimization. See G6. |
| Conflict detection | Partial | Published room overlap, class-instructor overlap, normal capacity and class term dates are enforced. Section, suitability, equipment, building hours, maintenance and exam rules are absent. See G3/G4. |
| Administrator review and approval | Partial | Draft/published is a boolean and registrars can publish directly. There is no separate approval/rejection/revision workflow or retained schedule versions. See G7. |
| Scheduling-policy/document retrieval with RAG | Missing | No policy ingestion, chunks/embeddings, authorized retrieval or source citations. See G8. |
| Natural-language scheduling inquiries | Missing | No assistant UI or query service. See G8. |
| Secure RESTful APIs | Missing for proposed integration contract | Supabase client calls, RPCs and server actions exist; app-owned versioned resources, external-client permissions and OpenAPI documentation do not. See G9. |
| Institutional branding and configuration | Missing | Name, presentation, floor labels and room geometry are defined in code/assets. No institutional settings or configurable rule administration. See G10. |
| Authentication and role-based authorization | Implemented foundation | Supabase sessions, administrator/registrar/instructor roles, server checks, RLS and optional TOTP/SMS MFA exist. Secretary and external-client responsibilities are not separately modeled. See G11. |
| Audit logging for important actions | Missing | `created_by`, SMS notices and authentication infrastructure are not an application-wide before/after audit trail. See G12. |

## Work to implement later

Priorities below indicate a suggested dependency order, not authorization to begin implementation. P1 establishes the data, safety and accountability foundation; P2 completes document, approval, assignment and API workflows; P3 completes the assistant on top of trustworthy records and policies. Every gap below remains part of PDF compliance unless explicitly removed from the agreed scope.

### G1 — Managed room inventory and authoritative building data (P1)

**PDF:** pages 4, 7–8, 10, 12 and 15. **Current evidence:** [room model and geometry](../lib/rooms.ts), [initial room migration](../supabase/migrations/20261112035004_scheduling.sql), [academic setup actions](../app/Http/Controllers/SetupController.php).

- [ ] Add persisted building/floor identity and authorized create, update, inspect and archive operations for rooms. Initially support one building with multiple floors.
- [ ] Extend room records with type, normal/exam capacities, equipment/quantities/condition, accessibility, allowed activities, operating hours, status and maintenance/availability blocks.
- [ ] Load shared room metadata from its authoritative source rather than maintaining independent UI capacities/names in `lib/rooms.ts` and database seeds. Keep map geometry linked by stable room IDs.
- [ ] Verify every in-scope room, floor, capacity and selectable boundary against the actual building. Existing assets explicitly say they are references, not authoritative measured drawings.
- [ ] Archive rooms without deleting historical assignments; explain affected future bookings and prevent invalid new assignments.

**Acceptance:** an authorized administrator can add/edit/archive a room; unauthorized users cannot. Map, booking choices and server rules use the same metadata. All verified in-scope rooms are represented, and archived/blocked rooms cannot receive invalid new published assignments.

### G2 — Weekly calendar, interval availability and schedule filters (P1)

**PDF:** pages 3–5. **Current evidence:** [one-day loader](../app/Http/Controllers/ExploreController.php), [daily workspace](../resources/js/explore/workspace.tsx), [weekly occurrence expansion](../lib/booking-validation.ts).

- [ ] Query and display a complete Monday–Sunday week with previous/current/next week navigation, a visible date range and an accessible agenda/mobile alternative. Keep daily access.
- [ ] Use Asia/Manila week bounds and complete pagination; retain selected room and canvas position.
- [ ] Add room/class/section/faculty/date/department filtering. Existing room/subject search and the instructor's own assignment list do not provide all these filters.
- [ ] Add a date/time interval check for available/occupied rooms, with reserved/unavailable states tied to an explicit policy or block. Preserve honest loading/error/unknown states.
- [ ] Keep weekly display distinct from recurrence creation. Define series-wide operations only if adopted; the PDF does not specify that all weekly editing must be series-wide.

**Acceptance:** a whole week's bookings, including weekends and off-hours meetings, remain discoverable; week changes and filters preserve access boundaries. Adjacent intervals are available, overlaps are occupied, and maintenance blocks are unavailable. A failed read never displays availability as confirmed.

### G3 — Examination scheduling and activity-specific room rules (P1)

**PDF:** pages 4–8, 10, 13 and 15. **Current evidence:** [booking kinds](../lib/rooms.ts), [booking validation](../lib/booking-validation.ts), [save action](../app/Http/Controllers/BookingController.php). Current kinds are `legacy`, `class`, and `activity`; an activity title does not implement examination semantics.

- [ ] Model examinations explicitly, linked to sections/subjects and expected examinees, with separate exam capacity and setup/preparation buffers.
- [ ] Capture required room type, equipment, accessibility and activity-specific requirements. Current room selection checks seats but does not enforce laboratory suitability.
- [ ] Validate operating hours, maintenance blocks, equipment and room use on the server/database and provide actionable explanations.
- [ ] Confirm department rules for seat spacing, proctoring, shared labs, split sections and permitted overrides before encoding them.

**Acceptance:** a room that fits a normal lecture but exceeds its exam capacity cannot host that exam. Incompatible rooms, maintenance periods, closed hours and exam buffer conflicts are rejected consistently through every write path.

### G4 — Section conflicts and reusable conflict explanations (P1)

**PDF:** pages 5–6 and 12–13. **Current evidence:** room exclusion constraint in the [initial migration](../supabase/migrations/20261112035004_scheduling.sql), instructor exclusion constraint in the [academic migration](../supabase/migrations/20261112061420_academic_allocations.sql), and [saveError](../app/Http/Controllers/BookingController.php).

- [ ] Confirm what constitutes a class/section conflict, including lecture/lab subgroups, then enforce simultaneous-section restrictions atomically across rooms and instructors.
- [ ] Extend validation to G3's additional constraint types and return structured conflict type, affected records, reason and resolution guidance.
- [ ] Reuse the rules for manual edits, imports, generated assignments, approval and publication; revalidate when concurrent data changes.

**Acceptance:** two simultaneous submissions cannot publish the same prohibited section assignment in separate rooms. Each supported conflict yields an understandable explanation; valid subgroup exceptions and back-to-back meetings still work.

### G5 — Secure PDF/policy uploads, extraction, OCR and verification (P2)

**PDF:** pages 3, 5, 9–12 and 15. **Current evidence:** no upload/parser/worker source; [IMPORT-EXPORT.md](IMPORT-EXPORT.md) explicitly describes planned work.

- [ ] Add authorized upload, file-type/content/size/page validation, private storage, document ownership, processing status and retention/deletion behavior. Support schedule and policy documents with distinct processing paths.
- [ ] Extract text from supported PDFs and detect scanned or mixed pages for OCR. Assess the proposed PyMuPDF/OCR approach or an approved equivalent without forcing processing into an unsuitable request runtime.
- [ ] Run longer extraction/OCR work as bounded background jobs with failure/retry/progress handling.
- [ ] Normalize course/component, section, instructor, class size, days and times with page/field provenance and confidence. Use AI interpretation where required; minimize provider-bound personal information.
- [ ] Provide editable low-confidence review and explicit handling of unsupported, ambiguous and incomplete input. Resolve against existing catalog entries, accounts and room IDs rather than inventing them.
- [ ] Save verified rows as authorized drafts transactionally, with duplicate/retry protection. Extraction must never publish directly.

**Acceptance:** representative text, scanned and mixed PDFs produce reviewable records with provenance; corrected records reach the right room/section/instructor. Malformed/oversized and unauthorized uploads fail safely; low-confidence values need review; a failed save leaves no partial batch or public records.

### G6 — Constraint-based classroom recommendations and optimization (P2)

**PDF:** pages 5–10 and 15. **Current evidence:** [wizard room choices](../resources/js/explore/staff-ui.tsx) are manual and capacity-filtered; no scheduling-run service or solver exists.

- [ ] Persist configurable hard rules, soft preferences/weights and scheduling-run inputs/results/progress. Collect missing department, equipment, accessibility, priority and room/floor preference inputs.
- [ ] Implement a solver, using the proposed OR-Tools service or an approved equivalent, after room/exam/section rules are defined.
- [ ] Enforce room, faculty, section, capacity, suitability, maintenance and examination constraints; optimize agreed capacity waste, proximity, room changes, preferences, utilization and accessibility objectives.
- [ ] Return candidate assignments, scores, explanations and unsatisfied constraints. Distinguish infeasible results from processing errors.
- [ ] Support human revision and G7 approval; revalidate before publication. Keep manual scheduling available if a processing service fails.

**Acceptance:** a known test dataset produces valid proposals, honors configured hard constraints and explains preferences. An infeasible dataset receives an explicit result without publishing invalid assignments.

### G7 — Approval lifecycle, decisions and schedule versions (P2)

**PDF:** pages 6–7, 10, 12–13 and 15. **Current evidence:** [PublishToggle](../resources/js/explore/staff-ui.tsx), [setPublished](../app/Http/Controllers/BookingController.php) and `bookings.published` support draft/public toggling only.

- [ ] Implement the document-to-schedule lifecycle: uploaded, extracted, for verification, draft, for review, approved, published and archived. Model document-processing and schedule states separately where appropriate.
- [ ] Store reviewer identity, decision, comments, timestamps, rejection/revision reasons and the exact version approved.
- [ ] Permit revision of proposed assignments, retain prior versions, and prevent publishing an unapproved or subsequently changed proposal.
- [ ] Define scheduling administrator versus secretary permissions and whether manual schedules require the same approval controls.

**Acceptance:** authorized users can revise, approve/reject and publish the intended version; unauthorized transitions fail server-side. Editing an approved proposal requires the defined reapproval path; archived versions remain inspectable.

### G8 — Policy retrieval and source-cited scheduling assistant (P3)

**PDF:** pages 2–3, 6, 8–12 and 15. **Current evidence:** no policy/chunk/vector/assistant/query implementation or model-provider dependency.

- [ ] Add approved policy documents with category, effective date, status, authorized chunks and embedding/retrieval storage; pgvector is proposed by the PDF but absent from current migrations.
- [ ] Add authorized natural-language inquiries over published/permitted scheduling records and relevant policies. Enforce permissions before retrieval and answer generation.
- [ ] Cite internal records, document pages and policies; distinguish retrieved facts from proposed assignments and disclose insufficient evidence.
- [ ] Ground availability/capacity answers in deterministic queries; use G6 for validated alternative-room suggestions rather than trusting model output as an assignment.
- [ ] Define provider choice, privacy, limits, failure handling and document-instruction isolation. Keep generated responses from approving/publishing schedules.

**Acceptance:** the PDF's example availability, lab-policy, exam-capacity and assignment-explanation questions receive supported answers with sources. Private drafts/documents do not leak across roles; missing evidence and provider failure have clear outcomes.

### G9 — Secure integration API and OpenAPI contract (P2)

**PDF:** pages 2–3, 8, 10–13 and 15. **Current evidence:** no `app/api/**/route.ts` handlers or OpenAPI specification; existing Supabase REST/RPC access supports the app but is not the proposed external integration contract.

- [ ] Define app-owned versioned resources for buildings/floors/rooms, interval availability, schedules, documents/status/records, scheduling runs/conflicts/approval/publication, assistant queries and audit access, as these capabilities become available.
- [ ] Add approved external-client identities/scopes/revocation, input validation, pagination, filtering, consistent errors and an OpenAPI specification. Do not expose privileged database credentials to clients.
- [ ] Reuse domain validation and enforce draft/document/audit visibility independently of browser controls; record relevant API access in G12.

**Acceptance:** an approved client can access only permitted resources; anonymous, revoked and out-of-scope requests fail. Pagination/filtering are deterministic and documented contracts match actual responses.

### G10 — Institutional identity and configurable settings (P1 foundation; extend with dependent modules)

**PDF:** pages 1–3, 7–8, 10 and 13. **Current evidence:** identity in [layout](../resources/views/app.blade.php), [manifest](../public/manifest.webmanifest), [welcome page](../public/welcome.html), CSS and the workspace; no institutional configuration model.

- [ ] Store institutional name, short name, logo, colors and building information with administrator-only updates; consume these consistently across the welcome page, workspace and installed-app identity where feasible.
- [ ] Provide controlled settings for room types, policies, operating hours and scheduling parameters; retain existing term/section setup.
- [ ] Use stable institution/building/floor references so a later multi-building release does not require replacing core relationships. Do not build multi-building UI solely to satisfy this one-building MVP.

**Acceptance:** approved identity/settings changes apply consistently without editing core application code; unauthorized changes fail and settings changes are audited.

### G11 — Complete role/responsibility mapping and account administration (P1)

**PDF:** pages 2–4 and 10–13. **Current evidence:** [role migration](../supabase/migrations/20261112061420_academic_allocations.sql), [session checks](../app/Services/AccountSession.php), [academic setup](../resources/js/explore/academic-setup.tsx) and [provisioning scripts](../supabase/admin/provision-initial-administrator.sql).

- [ ] Map system administrator, scheduling administrator, department secretary, faculty, student/public visitor and external system responsibilities to explicit permissions. Preserve existing registrar/instructor boundaries unless an agreed change replaces them.
- [ ] Add secretary request/submission/correction behavior if that distinct role remains required; currently no separate request or correction workflow exists.
- [ ] Complete the authorized account/role lifecycle. Instructor linking currently expects a confirmed Auth account created through Supabase administration; there is no complete in-app account/role administration interface.
- [ ] Extend existing RLS, server checks and role tests to uploads, recommendations, approvals, room management, APIs and audit views.

**Acceptance:** every role has a documented permission matrix and direct-request tests. A secretary cannot publish by bypassing the UI; instructors see only permitted private allocations; public users see only published fields.

### G12 — Durable application audit trail (P1)

**PDF:** pages 2–4, 10–13 and 15. **Current evidence:** bookings store creator information and SMS notices store notification state, but no application audit table/events/viewer exists.

- [ ] Record attributable room/configuration/account changes, logins/access events as appropriate, uploads, extraction verification, schedule edits, approval decisions, publication/archive and API access.
- [ ] Include actor, action, resource, timestamp, relevant old/new values and correlation to documents/runs/versions. Exclude passwords, OTPs, credentials and unnecessary personal data.
- [ ] Protect records from ordinary-user modification, restrict read access, and provide searchable/paginated audit inspection with retention controls.
- [ ] Capture important state changes transactionally so alternate write paths cannot silently omit required audit events.

**Acceptance:** a create → edit → review → approve → publish path has an attributable history including before/after changes; direct writes obey the same audit policy and unauthorized users cannot alter/read protected events.

### G13 — Operational privacy, recovery and release evidence (cross-cutting)

**PDF:** pages 12–15. **Current evidence:** [security/session code](../app/Services/AccountSession.php), reviewed migrations, `.env.example`, [CI checks](../.github/workflows), and existing test suites establish part of the foundation. This is a requirements review, not a legal compliance certification.

- [ ] Define retention and controlled deletion/anonymization for uploaded files, extracted records, embeddings, schedule history and audit data. Document minimum necessary AI-provider data and human approval boundaries.
- [ ] Document and exercise database/file backup and restore procedures; define incident-response responsibilities. Hosted-service defaults alone are not recovery evidence.
- [ ] Verify target-environment HTTPS, server secrets, preview/production separation, migration state and deployment behavior without recording secret values.
- [ ] Complete accessibility, mobile, performance and stakeholder acceptance checks against actual building data and representative PDF/solver datasets. Include unauthorized access, failed jobs, retries, concurrency and stale approvals.

**Acceptance:** retain dated results for representative functional scenarios, role tests, accessibility/performance checks, recovery exercises and stakeholder acceptance. Any remaining exception must be explicit rather than labeled complete.

## Suggested implementation sequence

1. Reconcile the PDF baseline with later scope decisions; collect authoritative room data, exam rules, role responsibilities, scheduling policies and representative text/scanned PDFs.
2. Complete G1/G3/G4 room and scheduling rules, G10 configuration foundations, G11 permissions and G12 audit infrastructure.
3. Deliver G2 weekly display and availability; begin G13 operational verification alongside each increment.
4. Deliver G5 secure document processing and verified draft saving, then G7 approval/versioning.
5. Deliver G6 automated recommendations using those rules and approval boundaries.
6. Add G9 integration resources incrementally with their modules, then G8 retrieval/assistant over approved, access-controlled records.
7. Evaluate the PDF's page-15 success criteria end-to-end and record any explicitly accepted scope exclusions.

Repository CSV exchange and designed PDF export remain separate planned work in [IMPORT-EXPORT.md](IMPORT-EXPORT.md). They may be delivered alongside these milestones, but should not push required PDF/OCR or assignment features out of a release described as compliant with this PDF.

## Verification performed during this audit

The checkout has no installed project `node_modules`. Existing documentation reports earlier passing checks, but those historical results were not treated as current verification.

| Check | Current result |
| --- | --- |
| PDF review | Extracted and reviewed all 16 PDF pages locally; page-specific requirements traced above. |
| Source review | Examined map/read/write paths, models, access controls, migration constraints, security/PWA/SMS foundations, test sources and planning documents. |
| `npm test` | 11 checks passed; the SMS test file failed to load because declared dependency `server-only` is not installed. The whole suite did not pass. |
| `npm run lint` | Blocked: `eslint` executable is unavailable without installed dependencies. |
| `npm run build` | Blocked: `next` executable is unavailable without installed dependencies. |
| Browser, live SQL, production and external integrations | Not run; no runtime/deployment completion claim. |

For a future implementation session, restore dependencies with the project's documented `npm ci`, then rerun lint, tests and build plus module-specific acceptance checks. These environment failures are not proof of an application regression and were not repaired as part of this documentation-only task.

## Documentation follow-up

- [DEVELOPMENT-STATUS.md](DEVELOPMENT-STATUS.md) contains differing historical test counts and an older wizard paragraph saying catalog/roles are planned, despite their implementation elsewhere in the same document and source.
- [TASKS.md](TASKS.md) retains unchecked foundational items that have source implementations. Review acceptance evidence before changing their checkboxes; an unchecked box alone does not prove a feature is absent.
- [DECISIONS.md](DECISIONS.md) still describes the shared workspace at `/` and redirecting `/staff` to `/`; [next.config.ts](../routes/web.php) currently serves the welcome page at `/` and redirects `/staff` to `/explore?signin=1`.
- Update these documents in a later documentation pass and explicitly label whether each release follows the original PDF, the later reduced scope, or a newly agreed baseline. Existing documents were left unchanged in this audit.
