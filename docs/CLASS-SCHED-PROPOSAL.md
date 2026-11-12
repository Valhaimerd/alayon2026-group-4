# CISC SchedFlow

## Proposed classroom scheduling and building map

CISC SchedFlow is a proposed progressive web app for managing classroom schedules and finding room availability in one academic building. Department staff maintain room and class information, check for conflicts, and publish schedules. Anyone can consult published schedules and a two-dimensional floor map. Detailed staff permissions remain to be confirmed. The competition build has a five-hour target, and the map is a priority.

## Problem and objectives

The proposal aims to make classroom use easier to see and reduce timetable conflicts. It should provide a shared view of room availability, distinguish class and examination bookings, and help staff assign rooms that meet capacity and usage needs. The current scheduling process and its problems still need to be confirmed with department staff.

## Recommended first release

- Manage one building, its floors, rooms, capacities, and permitted uses.
- Let authorized staff create and edit class and examination bookings with course or activity, room, date or recurrence, time, and responsible person.
- Block overlapping published bookings in the same room while allowing back-to-back bookings. Block publication when class size exceeds room capacity; confirm whether overrides are needed. Flag room-use mismatches.
- Support weekly classes within an academic term and one-time bookings for exams; defer complex recurrence exceptions.
- Provide room availability and daily or weekly schedule views, plus a clickable 2D floor map where a floor plan is available.
- Let department staff create, review, and publish schedules; anyone can view published information without signing in.
- Provide a responsive, installable PWA. Cache the app shell; show an offline state and avoid promising offline schedule access until its freshness and privacy rules are defined.

Acceptance details, roles, schedule rules, and actual floor plans require confirmation before implementation.

## Interface direction

The building floor plan is the main workspace, presented as a free-form canvas. Users can pan around it and zoom in or out; selecting a room opens its schedule and details without navigating away. On desktop, a left sidebar contains floor, date, time, search, and filter controls, while a right panel displays the selected room. Staff actions appear only to authorized staff. On mobile, collapse filters and show room details in a bottom sheet so the map remains usable. Include visible zoom and reset controls, room labels, and a searchable keyboard-accessible room list. Availability must not rely on color alone. Panning and zooming do not imply that users can edit the floor plan itself.

Drag empty canvas space to pan; use zoom buttons, mouse wheel, or pinch to zoom, and provide a Fit building control. Display Available, Occupied, or Unavailable for the selected date and time. Start with one floor; use clearly labeled demo data if verified building data is unavailable.

## Later capabilities

- Suggest room assignments from capacity, usage, availability, and scheduling constraints, with staff review before publication.
- Import schedules from PDFs after sample files and extraction accuracy requirements are available. Scanned PDFs may need OCR and manual correction.
- Explore a provider-backed AI assistant for document interpretation or scheduling guidance after the core scheduler works and sample data, provider choice, and costs are known. AI is not a current priority. Staff must review AI output; it must not silently publish schedules.
- Consider external APIs, multiple buildings or institutions, and configurable branding when there is a concrete need.

## Platform and architecture

See [Architecture and technology plan](ARCHITECTURE.md) for the stack, boundaries, deployment, and verification details.

- **Next.js and React:** application interface and server-side operations, hosted on Vercel.
- **Supabase:** PostgreSQL, authentication, and controlled data access. Schema changes and policies are maintained as reviewed migrations.
- **PWA:** web app manifest and service worker for installation and an explicitly defined offline experience; browser support varies.
- **Building map:** start with an accessible SVG floor plan and a list-based alternative; select other libraries only when needed.
- **HaturikoSMS:** notify the assigned instructor when a published room or time changes. The sender, consent flag, outbox, and failure status are implemented; sending is disabled by default and delivery remains unverified.
- **Scheduling and AI:** choose libraries or a separate service only after requirements and deployment constraints are established. The previous Laravel, Vue, Python, RAG, and OR-Tools stack is not a committed implementation.

## Initial data concepts

Building, floor, room, room use, academic term, course or activity, schedule, user or role, and publication status are candidates, not an approved schema. Confirm recurrence, room ownership, personal information, and exam rules before defining tables.

## Privacy and access

Limit access by role, protect personal information, and define retention and permissions with the department. Keep service credentials server-side. Review public display and offline caching of schedule details before release.

## Questions for the department

1. Which staff members can edit and approve schedules, and how are staff accounts provisioned?
2. Which building and rooms are in scope, and are usable floor plans and room capacities available?
3. What are the scheduling rules for classes versus exams, recurring bookings, conflicts, and exceptions?
4. Which assignment constraints are essential, and should non-AI assignment suggestions be included if time permits? Recommendation: deliver conflict-checked manual scheduling first.
5. Are sample PDFs and scheduling policies available, and is importing them required in the first release?
6. How will instructor phone numbers and consent be collected, and what SMS budget and failure process are available?
7. What must work offline, and may schedule data be stored on shared devices?
8. How will competition success be evaluated within the five-hour build?

## Delivery approach

Deliver one end-to-end scheduling slice and a usable map within the five-hour target. See the [delivery plan](PLAN.md) for priorities and fallback scope.
