# Plan

Use a rolling plan: keep later work broad and detail tasks when requirements are known. Build usable workflows end to end.

## Current phase: Define

- [ ] Establish users, workflows, and release scope.
- [ ] Define SMS scenarios and acceptance criteria.
- [ ] Define the first implementable task and its verification.
- [ ] Confirm the Supabase GitHub integration's production deployment setting.

## Later phases

- Foundation: initialize Next.js and prepare deployment and Supabase configuration as needed.
- Supabase configuration is initialized at the repository root. Define tables and access policies in migrations when requirements are known.
- Build and verify the first complete workflow, then expand to remaining release requirements.
- Verify and prepare the release.

## Task readiness and completion

A ready task has an outcome, scope, dependencies, acceptance criteria, and a verification method. Record missing criteria as questions; do not treat assumptions as requirements. A task is done when its criteria are verified and material limitations are recorded.

Review and test database migrations before merging to `main`. If automatic production deployment is enabled, confirm the deployment succeeds in Supabase afterward.
