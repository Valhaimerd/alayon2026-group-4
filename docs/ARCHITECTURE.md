# Architecture and technology plan

This describes the implementation direction. See [development status](DEVELOPMENT-STATUS.md) for implemented features, verification evidence, and remaining setup; not every planned feature is complete.

## Platform and stack

| Area | Choice | Status and purpose |
| --- | --- | --- |
| Application | Next.js App Router, React, TypeScript | Installed: Next.js 16.4.6 and React 19.3.0. Server-render pages by default and use client components for interactive calendars and maps. |
| Hosting | Vercel | Connected to GitHub; pushes to `main` target production. Preview deployments can support review. |
| Database | Supabase PostgreSQL | Scheduling tables, reviewed migrations, access policies and overlap/capacity checks are applied. |
| Authentication | Supabase Auth | Staff sign-in and role enforcement implemented; first staff account provisioning and browser validation remain. MFA is deferred. |
| Data access | Next.js server actions, Supabase JS and SSR clients | Staff mutations are authorized on the server and protected by row-level security. Public date-filtered schedule reads page through the safe published view. |
| SMS | HaturikoSMS REST API | Sender and publication outbox integrated; sending is disabled by default. Mock and database checks pass; live sending and delivery webhooks remain unverified. |
| PWA | Web app manifest and native service worker | Manifest, icons and offline fallback implemented; no private data caching or offline edits. Device installation/update validation remains. |
| Map | Interactive SVG canvas with accessible room list | Both supplied floor references have selectable classroom overlays, pan, zoom, reset, and details. Labels, capacities and geometry are illustrative; map editing is out of scope. |
| Scheduling | PostgreSQL and server-side validation | Recommended: deterministic conflict checks; choose implementation after recurrence and concurrency rules are defined. |
| AI | External provider, undecided | Later enhancement; provider, cost, data handling, and scope remain open. |
| Tooling | npm, ESLint, TypeScript, GitHub Actions | Starter and lint/build workflow exist. The SMS sender has a focused mocked test. |

## System boundaries

The browser requests pages and submits changes to Next.js. Authorized server-side operations read or write Supabase; database policies are an additional access boundary. Published room/time changes enqueue instructor notices transactionally. Sending is controlled by server configuration; a successful provider response means queued, not delivered. Superseded or unpublished changes are not eligible for retry. Public schedule reads use a projection that excludes private contact and staff fields.

Published bookings use a PostgreSQL exclusion constraint over half-open time ranges, allowing adjacent bookings and rejecting overlaps in the same room. Capacity is validated in the database. The initial implementation supports same-day one-time bookings in Philippine time; recurrence remains deferred. Drafts may overlap, but cannot be published if a conflict exists.

## Data concepts

The current schema contains rooms, staff membership, private instructor contacts, bookings, and SMS notifications. Buildings, terms, recurrence rules, room-use policies, and a detailed audit history remain future work. Review actual migration files for implemented columns and access policies.

## PWA behavior

Recommended initial scope: manifest, icons, install support where available, cached application shell, and a clear offline message. Do not cache private records or queue edits offline by default. If offline viewing becomes a requirement, define which published data is stored, its age, and shared-device behavior before adding it. Verify installation and update behavior on target browsers and devices.

## Deployment and environments

The GitHub `main` branch deploys the web application to Vercel. Confirm whether Supabase's separate deploy-to-production integration is enabled; do not assume a web deployment applies a database change. Review migrations before merging and check deployment logs. Configure environment variables independently in local and Vercel environments; do not commit secrets. Preview deployments must not be allowed to modify production data without an explicit environment and access decision.

## Verification strategy

For each workflow, verify authorization, input validation, error and loading states, and relevant database policies. Test overlapping bookings, adjacent times, capacity boundaries, recurring exceptions and concurrent submissions once the rules are confirmed. Check keyboard and mobile use for maps and schedules, and test PWA offline and update behavior on supported browsers. Run lint and build for repository changes.
