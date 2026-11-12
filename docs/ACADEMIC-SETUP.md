# Academic setup and allocation contracts

The academic migrations are applied to the connected competition project. Use `supabase/migrations/` as the schema history. Do not reapply those files manually. The source catalog is in [SUBJECT-CATALOG.md](SUBJECT-CATALOG.md), the typed reference is `lib/curriculum.ts`, and `supabase/catalog-seed.sql` is a repeatable insert that never overwrites existing definitions.

## Administrator setup

1. Sign in with the initial administrator/registrar account and open **Academic setup** in `/explore`.
2. Create the department's actual academic term: name, semester, first date and last date. No term dates are inferred from the current calendar.
3. Create its actual class sections, specifying year level and an optional single track per section. A track selection does not activate unresolved elective mappings.
4. Create/invite and confirm instructor accounts through Supabase Authentication administrator access. In **Instructor accounts**, enter the existing account email, institutional instructor code and display name, then select Active. Pending, banned and inactive accounts cannot receive new allocations.
5. To deactivate an existing profile, submit the same email/code/name with Active unchecked. Past meetings remain readable; registrars must review future affected meetings. Banned accounts can still be deactivated. Profiles are never deleted by this operation.

The initial account was explicitly granted administrator and registrar roles through `supabase/admin/provision-initial-administrator.sql`. That guarded bootstrap is separate from migrations. Existing staff memberships migrate to registrar only. Creating another staff account does not implicitly make it an administrator; use trusted administrator SQL to grant the intended explicit role. The application has no role self-promotion endpoint.

Administrator privileges alone do not allow scheduling. Combined roles must be assigned explicitly. Registrars cannot link instructor accounts, insert profiles, change catalog definitions or grant roles. Instructors can sign in and view their own private allocations plus published schedules, with no schedule mutation controls.

## Registrar workflow

Use **New booking** in the explorer. The Class step selects term, section, class code, approved subject, lecture/main or linked lab, and an active instructor account. Course, title, credits and placement derive from the selection. Class codes are text and retain leading zeros. Lecture and lab use the same section, parent subject and class code to resolve one offering; their instructors and rooms can differ.

Choose explicit dates/times, room and draft/publication state in the remaining steps. Weekly series expand into at most 150 dated meetings. All dates must fit within the academic term, and any published room or instructor conflict rejects the complete batch. Back-to-back intervals are allowed. Editing changes one occurrence. Saving selects its room and floor on the map.

Labs carry zero additional credits; the parent's credits count once per offering, regardless of meetings. No workload totals or meeting durations are inferred from units. Lab room suitability and subgroup rules still require department confirmation. Department activities are explicitly separate: a title, room and dated times, without invented subject metadata or instructor allocations.

Legacy bookings remain visible with their existing titles. They are not matched automatically to subjects or accounts. They can be unpublished, but editing/republishing as a class requires explicit mapping through the wizard. Existing published history stays readable.

## Database / RPC contract

`save_class_booking` is an authenticated, registrar-only RPC. Arguments:

| Argument | Meaning |
| --- | --- |
| `p_id` | Existing booking UUID for single-occurrence editing, otherwise null |
| `p_section` | Existing section UUID, which resolves term/curriculum/year/track |
| `p_parent`, `p_component` | Exact catalog codes; lab must link explicitly to this parent |
| `p_class_code` | Text offering code, 1–40 trimmed characters |
| `p_instructor` | Active profile UUID linked to a confirmed, unbanned instructor account |
| `p_room`, `p_size`, `p_published` | Room ID, positive class headcount and publication boolean |
| `p_slots` | JSON array of 1–150 `{ "start": "2031-01-06T09:00:00+08:00", "end": "2031-01-06T10:00:00+08:00" }` values |

Returns the number of saved meetings. Offering resolution and every meeting save share the same transaction. The offering identity is section + curriculum + parent subject + class code; the section already fixes the term. A failed request leaves no new offering or partial meeting rows. Posted title/units/year cannot overwrite canonical metadata, including through direct REST writes.

`provision_instructor(p_email, p_code, p_name, p_active)` is an authenticated administrator-only RPC. It returns the profile UUID and links an existing Auth account, preserving profile identity on later changes. It never creates an Auth user or converts a legacy name into an account by guessing.

Server actions retain `{ ok: boolean, message: string }` outcomes. Authentication failures ask the user to sign in; role failures report registrar/administrator access requirements. Validation errors identify invalid selections, term bounds or account eligibility. PostgreSQL `23P01` is mapped to a room/instructor conflict; batch errors explicitly report that no classes were saved. Unknown errors use a generic retry message, without internal details.

The existing six columns in `published_schedule` are preserved. Appended public fields are `kind`, `class_code`, `course`, `units`, `subject_code`, `subject_name`, and `year_level`. Drafts, account UUIDs, phone numbers and consent data are excluded. Base booking reads stay private: registrars see all permitted rows; instructors see their own assignments. Legacy API clients creating free-text classes must migrate to the new class contract or the explicit activity path.

## Verification and remaining scope

Run `npm test`, `npm run lint` and `npm run build`. `tests/academic-database.sql` assumes the migrations have been applied and must run inside a transaction that is rolled back; `tests/database.sql` provides a psql wrapper. It creates temporary synthetic account/term/meeting fixtures and sends no SMS. The opt-in `tests/phase34-live.mjs` uses an authorized registrar account and tests concurrent room protection with clearly labeled temporary activities.

The curriculum is provisional. Elective placeholders, add101, NSTP alternatives and track placements remain inactive until reviewed. CSV/PDF import/export, the full Monday–Sunday timetable, series-wide editing and instructor-only browser acceptance remain separate tasks. No real SMS delivery or physical-device installation claim follows from these database tests.
