# Delivery plan

The competition build has five hours. Prioritize a working demonstration with scheduling, public viewing, and the map. Time allocations below are targets, not guarantees. Use [implementation tasks](TASKS.md) for dependencies, acceptance criteria, and verification; see also [product](PRODUCT.md), [proposal](CLASS-SCHED-PROPOSAL.md), and [architecture](ARCHITECTURE.md).

## 1. Establish the demo (approximately 30 minutes)

- Confirm staff account access, room list, schedule rules, and floor plan availability.
- Use a clearly labeled illustrative floor plan and sample rooms if real material is unavailable.
- Confirm Supabase deployment configuration and keep preview access separate from production writes.

## 2. Scheduling slice (approximately 2 hours)

- Connect Supabase, implement staff sign-in, and add reviewed migrations and access policies.
- Create rooms and bookings, validate input and conflicts, and persist changes.
- Allow staff to publish; provide public viewing of published schedules.
- Verify permissions, persistence, conflicts, and concurrent submissions.

## 3. Map and PWA (approximately 1.5 hours)

- Build a responsive SVG floor-plan canvas with pan, zoom and reset controls, clickable rooms, an accessible room list, and a room schedule panel. Adapt controls and details to mobile.
- Add manifest, icons, installation support, and a clear offline state. Do not cache private data or queue offline edits.

## 4. SMS and release (approximately 1 hour)

- Connect the prepared HaturikoSMS sender to published room or time changes for the assigned instructor when consent and recipient data are available; report failures without blocking publication. Otherwise document the blocker.
- Verify mobile and keyboard behavior, core flows, deployment, and demo data. Record limitations.

AI, PDF import, RAG, multi-building support, and external APIs are later work. Recurrence and exam-specific rules depend on available requirements; use a clearly documented limited demo if these cannot be confirmed in time.

## Task readiness

Each task states outcome, scope, dependencies, acceptance criteria, and verification. Mark assumptions and missing criteria. Review and test database migrations before merging to `main`; confirm Supabase deployment if enabled.
