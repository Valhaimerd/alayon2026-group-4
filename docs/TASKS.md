# Implementation tasks

This is the working backlog for the five-hour competition build. Read the [proposal](CLASS-SCHED-PROPOSAL.md) and [architecture](ARCHITECTURE.md) first. Work from top to bottom, adjust scope against remaining time, and record actual results and limitations. A task is done only when its acceptance checks pass. Do not mark planned behavior as implemented.

## Current execution summary

Map, public schedule view, staff screens, database policies and constraints, PWA foundation, and notification integration are implemented. Phase 3's local staff access and Phase 4's same-day booking workflow are verified; see [development status](DEVELOPMENT-STATUS.md) for evidence. Production environment configuration, device pinch/install/update checks, simultaneous browser-tab submissions, and SMS delivery remain unverified. The initial implementation was pushed to `main`; the latest verification documentation is local until pushed.

## Working assumptions

- One building and one floor initially. Use clearly labeled demo rooms and schedules until real data is verified. Another chat is preparing room assets; inspect and coordinate before editing those files.
- Anyone may view published schedules; only authorized staff may create, edit, and publish. Staff provisioning and exact permissions need confirmation.
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

**Status:** ready with demo data; connect to task 3 after it is available. **Depends on:** stable room IDs from task 1.

- [ ] Show selected room name, type, capacity, and published schedule in a desktop side panel or mobile bottom sheet.
- [ ] Add date/time selection and clear available, occupied, unavailable, loading, empty, and error states. Until an unavailability rule is agreed, use unavailable only for explicitly unavailable rooms, not missing data.
- [ ] Replace demo schedule data with the public read path from task 3 without exposing drafts, phone numbers, or staff-only fields.

**Acceptance:** changing date or room updates the displayed schedule and status; no selection and no bookings have understandable states; a failed data request is not presented as availability. Verify with sample bookings, an empty room, and a simulated failure; check keyboard and mobile interaction.

## 3. Supabase data and staff access

**Status:** local access verified; production environment and integration settings still need confirmation. **Depends on:** confirmed project target; coordinate room IDs with task 1.

- [ ] Confirm the Supabase project and whether GitHub migrations deploy to production. Keep preview writes away from production. Use local/test data where practical.
- [x] Define the smallest room, booking, and staff authorization model needed for one-time bookings. Store draft/published state, capacity, room, activity, start/end, and staff ownership or role as needed. Agree how the initial staff account is provisioned without enabling public self-promotion.
- [x] Create reviewed migration(s) and row-level security policies. Public reads expose only published schedule fields; unauthenticated and non-staff users cannot write or read private instructor contact data.
- [x] Add server-side Supabase configuration and staff sign-in; keep privileged credentials server-side. Preserve existing environment values and document required names without values.

**Acceptance:** public reads return published records only; unauthorized writes and draft/private reads fail; an authorized staff member can sign in and write permitted data. Test policies against anonymous, non-staff, and staff contexts, and verify migration application and rollback strategy on a nonproduction target where available. Record deployment status.

## 4. Create and publish a booking

**Status:** complete for the local same-day, one-time booking scope. Weekly recurrence is deferred. **Depends on:** tasks 2 and 3.

- [x] Provide a staff-only form to create and edit a one-time class or exam with room, activity, start/end, class size, and instructor information needed for the demo.
- [x] Validate required fields, end after start, room capacity, and overlapping published bookings; allow an end time equal to another booking's start. Enforce conflict protection in the database or an equivalent atomic transaction, not just the browser.
- [x] Publish valid bookings and make them appear in the public room view. Display actionable validation, loading, and failure states. Preserve drafts if the chosen model supports them.
- [ ] If time permits, add weekly recurrence within a term with conflict checks for every occurrence; otherwise state the one-time limitation in the demo.

**Acceptance:** a valid booking survives refresh and appears publicly only after publication; an over-capacity or overlapping booking cannot be published; adjacent bookings can; concurrent attempts cannot both create conflicting published bookings. Test invalid input, anonymous access, refresh, adjacent/overlapping times, and concurrent submissions. Do not claim recurring support until tested.

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
- [ ] Walk through public map → room → schedule and staff sign-in → create → publish → public view. Exercise conflict, permissions, loading/error, mobile, keyboard, PWA, and SMS failure paths that were implemented.
- [ ] Verify the intended Vercel deployment and Supabase migration target. Label sample data and record missing features, known limitations, and any unverified integration.

**Acceptance:** the demo has a working map and at least one honest end-to-end scheduling path, or clearly identifies any unfinished part. Do not represent mock data, queued messages, or an unverified deployment as live functionality.
