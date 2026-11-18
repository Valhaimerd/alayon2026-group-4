# PDF implementation checklist

Created: 17 November 2026 (Asia/Manila).

Framework update, 18 November 2026: the authorized Laravel/React/Inertia conversion preserves the existing interface and Supabase schema. Use [migration notes](LARAVEL-MIGRATION.md) for current commands/source paths. Missing PDF features below remain unchecked; the framework change alone does not complete them.

Based on the [PDF implementation audit](PDF-IMPLEMENTATION-AUDIT.md) of `CISC SchedFlow.pdf`. The audit contains PDF page references, source evidence and detailed acceptance criteria. G1-G13 below refer to its gap identifiers.

This checklist tracks remaining work, not a new implementation. All items begin unchecked. Check an item only after its implementation or decision is documented; check acceptance items only after recording verification evidence. Existing map, manual scheduling, authentication and overlap protections should be preserved and regression-checked.

## 1. Confirm requirements and prepare inputs

- [ ] Record the agreed release baseline, including differences between the original PDF and the later repository plan.
- [ ] Record whether the current Laravel/React/Inertia/Supabase stack satisfies the PDF's technology requirements; the user has authorized replacing Next.js while preserving React.
- [ ] Obtain verified building/floor plans, room identities, capacities and inventory details.
- [ ] Obtain examination, room suitability, section/subgroup, operating-hour and maintenance rules.
- [ ] Confirm roles, publication authority, approval responsibilities and override rules.
- [ ] Obtain representative text, scanned and mixed PDF schedules, plus approved policy documents.
- [ ] Define measurable extraction accuracy, solver validity, performance and stakeholder acceptance targets.
- [ ] Record unresolved requirements and any explicitly accepted exclusions without marking excluded features as implemented.

## 2. Complete foundational permissions, configuration and audit records

### G11: Roles and account administration

- [ ] Document permissions for system administrator, scheduling administrator/registrar, department secretary, instructor, public/student viewer and external client.
- [ ] Implement the secretary request, submission and correction workflow if retained in scope.
- [ ] Complete authorized account provisioning, activation/deactivation and role assignment administration.
- [ ] Enforce permissions through server checks and database policies for each new module.
- [ ] Verify direct requests cannot bypass role restrictions, including draft/private-allocation visibility.

### G10: Institutional settings

- [ ] Persist institutional name, short name, logo, colors and building identity.
- [ ] Provide administrator-only settings updates.
- [ ] Apply configured identity across the welcome page, workspace and PWA metadata where feasible.
- [ ] Add controlled settings for room types, operating hours, policies and scheduling parameters as their modules become available.
- [ ] Use stable institution/building/floor references while retaining one-building release scope.
- [ ] Verify settings updates are authorized, applied consistently and audited.

### G12: Application audit trail

- [ ] Create protected audit storage with actor, action, resource, timestamp and relevant before/after values.
- [ ] Capture account/role, room, configuration and schedule changes transactionally where required.
- [ ] Extend audit capture to uploads, verification, runs, approvals, publication, archival and API access with each module.
- [ ] Exclude credentials, passwords, OTPs and unnecessary personal information.
- [ ] Add authorized audit search, pagination and retention controls.
- [ ] Verify required direct-write paths produce events and ordinary users cannot alter protected audit records.

## 3. Complete room inventory and scheduling rules

### G1: Building, floor and room management

- [ ] Persist building and floor records linked to stable room IDs.
- [ ] Add authorized room create, inspect, update and archive operations.
- [ ] Store normal/exam capacity, room type, equipment quantities/condition, accessibility and allowed activities.
- [ ] Store operating hours, availability restrictions, maintenance periods and room status.
- [ ] Use shared authoritative room metadata in map details, room selection and server validation.
- [ ] Verify all in-scope rooms, capacities, floor labels and selectable boundaries against actual building data.
- [ ] Preserve historical assignments when rooms are archived and identify affected future bookings.
- [ ] Verify unauthorized inventory changes fail and blocked/archived rooms cannot receive invalid new published assignments.

### G3: Examination and activity-specific rules

- [ ] Model examinations explicitly with subject/section links and expected examinees.
- [ ] Apply examination capacity separately from normal class capacity.
- [ ] Model required equipment, room type, accessibility and activity requirements.
- [ ] Enforce operating hours, maintenance restrictions and room suitability.
- [ ] Enforce agreed exam setup/preparation buffers, spacing and proctoring rules.
- [ ] Verify a lecture-capable room can still be rejected for an over-capacity exam or incompatible activity.

### G4: Conflict enforcement and explanations

- [ ] Define section/subgroup overlap rules and permitted lecture/lab exceptions.
- [ ] Enforce prohibited section overlaps atomically across different rooms and instructors.
- [ ] Return conflict type, affected records, explanation and resolution guidance.
- [ ] Share validation across manual edits, import, solver results, approval and publication as each workflow is added.
- [ ] Revalidate affected constraints when concurrent data changes.
- [ ] Verify concurrent prohibited assignments cannot both publish, while valid adjacent bookings and subgroup exceptions succeed.

## 4. Complete weekly display and availability

### G2: Calendar, filters and room status

- [ ] Load a complete Monday-Sunday week with Asia/Manila boundaries and full pagination.
- [ ] Add previous/this/next week navigation and an explicit date-range label.
- [ ] Display a readable weekly timetable, accessible agenda and mobile alternative while retaining daily access.
- [ ] Preserve room selection and map position when changing weeks or editing bookings.
- [ ] Add room, class, section, faculty, date and department filters.
- [ ] Add date/time interval availability checks without hiding the full weekly schedule.
- [ ] Derive available, occupied, reserved and unavailable states from actual bookings and agreed restrictions.
- [ ] Preserve loading/error/unknown states and distinguish display from recurring-booking creation.
- [ ] Verify weekends, off-hours meetings, week/year boundaries, back-to-back bookings, role visibility and maintenance blocks.

## 5. Implement secure document processing

### G5: PDF upload, extraction, OCR and verification

- [ ] Add authorized schedule/policy PDF upload with private storage and ownership.
- [ ] Validate file contents/type, size and page limits on the server.
- [ ] Track upload/processing states, failures, progress and bounded retries.
- [ ] Extract embedded text from supported PDF layouts.
- [ ] Detect scanned/mixed pages and process them through OCR.
- [ ] Run long extraction/OCR tasks through bounded background processing.
- [ ] Normalize course/component, section, instructor, class size, days and times.
- [ ] Retain source page/field provenance and confidence for extracted values.
- [ ] Add AI-assisted interpretation with defined provider/data handling and deterministic validation.
- [ ] Provide editable review for uncertain, incomplete, ambiguous and unsupported input.
- [ ] Resolve against existing catalog entries, instructors, sections and room IDs without inventing records.
- [ ] Save verified rows as authorized drafts atomically with duplicate/retry protection.
- [ ] Verify representative text/scanned/mixed PDFs meet agreed accuracy targets.
- [ ] Verify unauthorized/malformed/oversized inputs fail safely and failed saves leave no partial or published records.

## 6. Implement review, approval and schedule history

### G7: Lifecycle and versions

- [ ] Model uploaded, extracted and for-verification document states.
- [ ] Model draft, for-review, approved, published and archived schedule states.
- [ ] Store reviewer identity, decisions, comments, timestamps and rejection/revision reasons.
- [ ] Retain schedule versions and link approval to the exact reviewed version.
- [ ] Support authorized revision, approval, rejection and archival.
- [ ] Define and enforce approval requirements for manual versus generated schedules.
- [ ] Require the agreed reapproval path after an approved proposal changes.
- [ ] Verify unauthorized transitions and publication of unapproved/stale versions fail; historical versions remain inspectable.

## 7. Implement automated classroom recommendations

### G6: Scheduling engine

- [ ] Persist scheduling rules, hard constraints, soft weights and run inputs/results/status.
- [ ] Collect department, room/floor preference, equipment, accessibility and priority inputs.
- [ ] Select and implement OR-Tools or an agreed equivalent compatible with the existing application.
- [ ] Enforce room, faculty, section, capacity, activity, maintenance and examination constraints.
- [ ] Optimize agreed capacity use, proximity, room changes, preferences and utilization.
- [ ] Return candidate assignments, scores, reasons and unsatisfied constraints.
- [ ] Distinguish infeasible schedules from processing failures.
- [ ] Support human revision and approval; revalidate immediately before publication.
- [ ] Preserve manual scheduling when the processing service is unavailable.
- [ ] Verify known feasible/infeasible datasets, expected preferences and failure handling without publishing invalid proposals.

## 8. Add integration APIs alongside available modules

### G9: Versioned API and contract

- [ ] Define versioned building/floor/room, availability and schedule resources.
- [ ] Add document/status/record, run/conflict, approval/publication, assistant and audit resources as their modules become available.
- [ ] Add approved client identities, scopes, revocation and server-side resource authorization.
- [ ] Implement consistent validation errors, filtering and deterministic pagination.
- [ ] Reuse domain validation and preserve draft/document/audit visibility rules.
- [ ] Publish an OpenAPI contract matching implemented behavior.
- [ ] Audit relevant API access without exposing privileged credentials.
- [ ] Verify approved clients access only permitted resources; anonymous, revoked and out-of-scope requests fail.

## 9. Implement policy retrieval and the scheduling assistant

### G8: RAG and natural-language inquiries

- [ ] Store approved policy documents with category, effective date, status and access permissions.
- [ ] Implement document chunks, embeddings and authorized retrieval storage.
- [ ] Add an assistant interface and authorized query service.
- [ ] Ground availability/capacity answers in deterministic schedule queries.
- [ ] Retrieve relevant policies and cite internal records, document pages and policy sources.
- [ ] Distinguish facts, proposed assignments and insufficient evidence in responses.
- [ ] Use validated solver results for alternative-room recommendations.
- [ ] Define provider privacy, cost/time limits, failure behavior and protection against instructions embedded in documents.
- [ ] Prevent assistant output from directly approving or publishing schedules.
- [ ] Verify the PDF's availability, lab-policy, exam-capacity and assignment-explanation examples with source citations.
- [ ] Verify private records cannot leak across roles and missing evidence/provider failures have clear outcomes.

## 10. Complete operations, documentation and release acceptance

### G13: Privacy, recovery and deployment

- [ ] Define retention/deletion/anonymization for uploads, extracted data, embeddings, schedule history and audit events.
- [ ] Document minimum necessary AI-provider data and human approval boundaries.
- [ ] Document and test database/file backup and restore procedures.
- [ ] Define incident-response responsibilities and procedures.
- [ ] Verify HTTPS, server-secret configuration, environment separation and migration state on the intended target.
- [ ] Verify the deployed release and record its limitations.

### Project checks and documentation

- [ ] Restore project dependencies using the existing npm lockfile (`npm ci`) before runtime checks.
- [ ] Run `npm run lint`, `npm test`, `composer test` and `npm run build`; record results for the implemented PDF release and remaining blockers.
- [ ] Run relevant database/authorization/concurrency checks on a confirmed test target.
- [ ] Verify keyboard navigation, readable labels/contrast, non-color status indicators and mobile behavior.
- [ ] Measure map/search/processing performance against the agreed workload targets.
- [ ] Update stale status/test-count statements in [DEVELOPMENT-STATUS.md](DEVELOPMENT-STATUS.md).
- [ ] Reconcile [TASKS.md](TASKS.md) checkboxes with actual implementation and acceptance evidence.
- [ ] Correct outdated route descriptions in [DECISIONS.md](DECISIONS.md).
- [ ] Update setup, architecture, API and workflow documentation for implemented behavior.

### Final PDF success criteria (page 15)

- [ ] Represent every verified in-scope room and floor in the selected building.
- [ ] Display accurate room schedules through the 2D map.
- [ ] Extract required fields from representative documents at the agreed accuracy.
- [ ] Detect room, capacity and time conflicts, plus agreed section/faculty/suitability restrictions.
- [ ] Generate valid room-assignment proposals for a test dataset.
- [ ] Apply different capacity rules to classes and examinations.
- [ ] Demonstrate authorized review, revision, approval and publication.
- [ ] Answer authorized scheduling/policy questions using approved sources.
- [ ] Demonstrate secure integration API access without exposing privileged database access.
- [ ] Demonstrate attributable audit history for significant actions.
- [ ] Record stakeholder acceptance and any explicitly accepted exceptions.

## Separate repository additions

Track CSV exchange, designed PDF export, SMS delivery and physical-device PWA verification through [TASKS.md](TASKS.md) and [IMPORT-EXPORT.md](IMPORT-EXPORT.md). These remain part of the later repository plan and do not replace the original PDF's missing initial capabilities. Multi-building UI, indoor positioning, live occupant tracking and 3D visualization remain outside this initial checklist.
