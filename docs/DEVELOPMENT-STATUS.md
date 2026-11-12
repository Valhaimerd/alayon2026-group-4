# Development status

## Implemented locally

- Building explorer uses both supplied floor references, selectable classroom overlays, floor/search/date/time controls, zoom, pan, Fit building, and desktop/mobile room panels. Room labels, capacities, and geometry remain illustrative and need verification.
- Public schedule reads connect to Supabase. Without configuration the explorer uses labeled demo data. Failed reads show unknown availability.
- Staff sign-in, authorization, instructor creation, and same-day one-time booking create/edit/publish screens are implemented. Weekly recurrence, overnight bookings, detailed exam policies, and staff room editing are not implemented.
- The scheduling migration was applied to the existing Supabase project. Database tests exercised overlap rejection, adjacent bookings, capacity, draft privacy, and unauthorized access inside a rolled-back transaction. Two simultaneous browser submissions have not yet been tested.
- Published room/time edits enqueue instructor notices when recipient data and consent exist. Sending is disabled by default; enable `HATURIKOSMS_SEND_ENABLED=true` only when ready and configure `NEXT_PUBLIC_SITE_URL` to the HTTPS public schedule page. Queued messages do not confirm delivery; webhooks are not implemented.
- PWA manifest, icons, service worker registration and a static offline page are implemented. Private data and offline writes are not cached. Browser installation and update behavior need final device validation.

## Verification evidence

Lint, TypeScript production build, and the two focused Node tests pass. Rolled-back database checks also cover same-day limits, obsolete notification suppression, and private base-table reads. Browser checks at 1440×900 and 390×844 exercised floor switching, room details, search/empty results, zoom/reset, invalid sign-in, and the offline fallback when the server was unavailable. Pinch gestures, install/update behavior on physical devices, and a signed-in staff browser flow remain unverified.

## First staff account

The requested email has no Supabase Auth account yet. In the target project's Authentication user administration, create the account with an owner-chosen password or invitation flow. Verify the account, then add its user ID to `public.staff_members` using the administrator's database access. Never allow users to grant themselves the staff role. No password was invented or account impersonated during development.

After provisioning, verify the full staff browser flow: sign in, add an instructor, save a draft, publish, edit the published room/time, and inspect notification status. Use test SMS credentials and an owned simulator/recipient as appropriate.

## Deployment

Changes are on the local feature branch. Set Supabase environment values in the intended Vercel environment before deployment. Migration filename matches the version applied through Supabase MCP. Review before merging to `main`; no application deployment has been initiated by this development pass.
