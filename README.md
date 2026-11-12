# Alayon 2026 Group 4

Next.js application with Supabase and HaturikoSMS planned. Product requirements are being defined.

## Local setup

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Run `npm run lint` and `npm run build` to verify changes.

Copy `.env.example` to `.env.local` when integration credentials are needed. The placeholders are not used by the starter yet. Keep secrets out of Git; the Supabase publishable key is intended for client use, but database passwords, secret keys and the HaturikoSMS key must remain server-side.

Supabase configuration lives in `supabase/`. Database migrations will be added when requirements are known. Review migrations before merging to the production branch.

See [product](docs/PRODUCT.md), [plan](docs/PLAN.md), and [decisions](docs/DECISIONS.md).
