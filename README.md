# Alayon 2026 Group 4

CISC SchedFlow: a map-first room scheduling application built with Next.js and Supabase. See [development status](docs/DEVELOPMENT-STATUS.md) for remaining setup and verified behavior.

## Local setup

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Run `npm run lint`, `npm test`, and `npm run build` to verify changes.

Copy `.env.example` to `.env.local` and configure Supabase for persisted schedules and staff access. Without it the public map uses labeled demo bookings. SMS is integrated but disabled unless `HATURIKOSMS_SEND_ENABLED=true`; configure a test key and `NEXT_PUBLIC_SITE_URL` before testing provider integration. Tests mock SMS requests and send no messages. Keep secrets out of Git and browser code.

Supabase migrations live in `supabase/migrations/`. They are already applied to the connected project; do not reapply them manually. Review future migrations before merging to the production branch. Run `tests/database.sql` only on a known test target or as the documented rolled-back verification; it creates temporary test records inside a transaction.

See [product](docs/PRODUCT.md), [plan](docs/PLAN.md), and [decisions](docs/DECISIONS.md).

## Welcome page and scroll motion

Open [schedflow-welcome.html](schedflow-welcome.html) directly in a browser for the standalone registrar welcome reference. GSAP 3.13.0 and Lenis 1.3.27 load from pinned CDN URLs. If a CDN is unavailable, the page retains native scrolling and readable content. There is no login flow in this reference.

The welcome page uses one GSAP ticker for both Lenis and ScrollTrigger. Its rooms/classes/schedules typography stage, masked headline, moving room/class/time labels, preview cursor following, and traveling Explore button respect reduced motion. Touch scrolling stays native; smoothing is for wheel input. The Explore button moves between hero, navbar, and final section.

The Next.js app also installs Lenis via npm and mounts one client-side instance in app/smooth-scroll.tsx. Its effect destroys the instance on unmount. The map workspace, nested control panels, and dialogs retain native input through the prevent callback; page links and document scrolling use Lenis. Add data-lenis-prevent to future scrollable overlays that should handle their own gestures. See the [Lenis documentation](https://github.com/darkroomengineering/lenis).
