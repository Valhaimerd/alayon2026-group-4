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
