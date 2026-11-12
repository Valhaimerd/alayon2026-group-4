-- psql entry point. Academic fixtures replace the legacy broad-staff checks.
-- Run only against an authorized target. Everything is rolled back.
begin;
\ir academic-database.sql
rollback;
