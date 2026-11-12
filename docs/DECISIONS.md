# Decisions

Record consequential decisions here with their context and reasoning when made. Confirmed product requirements belong in [PRODUCT.md](PRODUCT.md).

## Database changes

Keep schema changes and access policies in Supabase migration files under `supabase/migrations/`, with the Supabase working directory at the repository root. The intended GitHub production branch is `main`. Automatic deployment applies pending migrations to the connected production database when enabled; confirm its setting before relying on it. Review and test migrations before merging.

## Authentication direction

Authenticator-app MFA is the preferred option if the requirements permit it. HaturikoSMS is required for project SMS functionality; whether SMS is required for authentication remains open.
