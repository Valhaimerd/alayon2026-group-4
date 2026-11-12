# Development status

## Implemented locally

- Building explorer uses both supplied floor references, selectable classroom overlays, floor/search/date/time controls, zoom, pan, Fit building, and desktop/mobile room panels. Room labels, capacities, and geometry remain illustrative and need verification.
- Public schedule reads connect to Supabase. Without configuration the explorer uses labeled demo data. Failed reads show unknown availability.
- Staff sign-in, authorization, instructor creation, and same-day one-time booking create/edit/publish screens are implemented. Weekly recurrence, overnight bookings, detailed exam policies, and staff room editing are not implemented.
- The scheduling migrations are applied to the existing Supabase project. Rolled-back tests cover database policies and constraints. Two concurrent authenticated API submissions were also tested: one succeeded and the overlapping submission was rejected. Simultaneous submissions from two separate browser tabs were not tested.
- Published room/time edits enqueue instructor notices when recipient data and consent exist. Sending is disabled by default; enable `HATURIKOSMS_SEND_ENABLED=true` only when ready and configure `NEXT_PUBLIC_SITE_URL` to the HTTPS public schedule page. Queued messages do not confirm delivery; webhooks are not implemented.
- PWA manifest, icons, service worker registration and a static offline page are implemented. Private data and offline writes are not cached. Browser installation and update behavior need final device validation.

## Verification evidence

Lint, TypeScript production build, and the two focused Node tests pass. Rolled-back database checks also cover same-day limits, obsolete notification suppression, and private base-table reads. Browser checks at 1440×900 and 390×844 exercised floor switching, room details, search/empty results, zoom/reset, invalid sign-in, and the offline fallback when the server was unavailable. Pinch gestures and install/update behavior on physical devices remain unverified.

## Phase 4 acceptance evidence

Verified through the local production UI: create an instructor without SMS consent; save a draft; confirm it is absent from public schedules; publish it; verify room occupancy and schedule details; change the room and times; verify the public changes; reject excess capacity and overlapping bookings; accept a back-to-back booking; and unpublish a booking so it disappears publicly. These tests used clearly labeled temporary records on 8 January 2030. They were removed afterward, and no notices were queued or sent.

The opt-in [live access test](../tests/phase34-live.mjs) passed staff sign-in, session refresh, staff membership lookup, anonymous private-read/write denial, and concurrent overlap rejection. It cleans up its own bookings. To run it, set `RUN_LIVE_ACCESS_TESTS=true`, `E2E_STAFF_EMAIL`, and `E2E_STAFF_PASSWORD` in the shell for an authorized test target, then run `node tests/phase34-live.mjs`. It reads Supabase configuration from `.env.local` and is excluded from the default unit-test command. Never put credential values in tracked files.

## First staff account

Phase 3's local account setup is verified. The confirmed Auth account for the initial staff member has been granted staff membership using the guarded provisioning script. Browser checks confirmed successful sign-in, access after refresh, and return to the sign-in screen after sign-out and refresh. Deployment environment configuration and session-expiry behavior still need separate verification.

For future provisioning, create and confirm the intended Auth account, then grant its staff membership through administrator access. The [initial staff provisioning script](../supabase/admin/provision-initial-staff.sql) targets only the initial account, refuses missing or unconfirmed accounts, and can be rerun safely. A signed-in nonstaff account must be denied staff access.

Never allow users to grant themselves the staff role. Credentials are not stored in the repository.

The full same-day staff scheduling browser flow is now verified as described above. Weekly recurrence remains deferred. Test SMS provider integration separately with test credentials and an owned simulator/recipient as appropriate.

## Deployment

The initial implementation was pushed to GitHub `main` in commit `a6ab98f`. Set Supabase environment values in the intended Vercel environment and verify deployment separately. Migration filenames match the versions applied through Supabase MCP. The Phase 3 provisioning script and status update are local until committed and pushed.
