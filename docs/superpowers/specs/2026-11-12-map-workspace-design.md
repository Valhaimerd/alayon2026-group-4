# Map workspace visual redesign

Status: approved and implemented locally; see development status for browser evidence and remaining device checks. Scope is `/explore` and its scheduling, setup and account dialogs. The welcome page and database behavior are outside this redesign.

## Intent

CISC SchedFlow should feel like a focused building workspace: the floor plan is the main working surface, with navigation and schedule details around it. Users pan and zoom like a design tool, select a room, and inspect or manage its schedules without leaving the map. This remains a room explorer and scheduler; it does not become a floor-plan geometry editor.

The user requests a more polished light-mode interface with yellow, dark green and gradients. The map remains the visual priority. Use the real existing rooms, availability states, academic data and role-specific actions. Preserve all current functionality and concurrent account/security changes.

## Direction considered

1. **Green header, white inspectors, light drawing surface — recommended.** A dark green header establishes identity; white control panels keep forms readable. Yellow marks selection and important actions. Gradients provide depth in a few deliberate places.
2. Fully floating white tool cards over the map. More canvas is visible, but filters, long room lists and registrar controls would compete and overlap on smaller screens.
3. A dark green sidebar with a yellow-accented canvas. Strong branding, but the dense filters and schedules would be harder to scan, and it moves away from the requested light-mode feel.

Option 1 was approved and implemented. Keep one consistent visual system across the map, booking wizard and account/setup dialogs.

## Palette and typography

| Token | Value | Use |
| --- | --- | --- |
| Forest | `#103F2E` | Header, primary text, primary buttons and selected outlines |
| Leaf | `#235B43` | Green gradient endpoint, active tools and available-room outlines |
| Sunflower | `#F3C64E` | Selected room, active floor indicator and compact accents |
| Paper | `#F6F8F2` | Light canvas and application background |
| White | `#FFFFFF` | Panels, forms, dialogs and toolbar surfaces |
| Slate | `#5F7168` | Supporting text with contrast verified on its actual surface |

Derive pale green/yellow surfaces from these colors; do not introduce unrelated accent colors. Occupied uses an amber shade with explicit text, unknown uses a neutral treatment, and errors keep a distinct accessible danger color. Yellow is not used for small text on white. Do not use green/yellow alone to encode availability.

Use Manrope as one self-hosted variable font, bundled with its verified distribution license; retain a system sans-serif fallback if the asset cannot be obtained. No runtime font CDN. Use 14px body text, 12px supporting text, 16px section headings and 28–32px room headings. Prefer tabular digits for time, capacity and zoom values. Avoid tiny body labels, excessive all-caps headings and decorative monospace data.

## Layout

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Green header: brand / building             role-aware actions / account│
├───────────────┬───────────────────────────────────┬────────────────────┤
│ Floor switch  │ Building / current floor          │ Selected room      │
│ Search        │                                   │ Capacity / status  │
│ Date / time   │           Building map            │                    │
│               │          Pan / zoom / select      │ Schedule / details │
│ Room list     │                                   │                    │
│ Staff actions │ Legend               Zoom / fit    │ Allowed actions    │
└───────────────┴───────────────────────────────────┴────────────────────┘
```

Everything is left-aligned except centered room labels and the map controls. Use consistent 8px spacing increments with 16–24px panel padding. Borders explain hierarchy; shadows are reserved for surfaces elevated over the canvas. Controls use 8–10px radii, overlay panels/dialogs 16px, badges pill radii. Avoid making every section an identical card.

### Header

- Approximately 72px tall on desktop and 64px on small screens. Forest-to-Leaf gradient with white text; yellow is an accent, not a full yellow header.
- Refine the existing brand mark and name; no logo or product rename.
- Keep the existing public, instructor, registrar and administrator actions. Account, notifications and setup controls must not disappear when the header is crowded.
- At narrower widths, put secondary navigation in a labeled, keyboard-accessible More control. Sign-in/account and the current primary task remain directly accessible. Do not invent Import, Export or AI buttons before those features exist.
- Keep authentication/MFA behavior and form semantics unchanged.

### Left controls

- A white navigator with a compact building/floor context, two-position Ground/Second floor switch, search, grouped date/time inputs and a scrollable room list.
- The floor switch keeps the same state and data as the existing floor select, using accessible radio or pressed-button semantics.
- Selected room row uses a pale yellow gradient, a Forest border/marker and an explicit selected state. Unselected rows stay quiet; availability is a labeled dot/icon, not color alone.
- Use locally rendered SVG icons from one consistent stroke system. Preserve text labels for inputs and accessible names on icon buttons. No new component/icon dependency is required.
- Registrar controls, instructor-only assignments and administrator actions retain their role boundaries. Long assignment lists must scroll inside the panel instead of pushing the canvas below the viewport.

### Canvas and floor plan

- Paper background with a lower-contrast dot grid and a restrained radial yellow/green wash near the canvas edges. Keep the floor plan crisp and readable.
- Retain both existing raster floor references, all room coordinates, stable IDs, SVG viewBox behavior and floor-specific geometry. Do not redraw or recolor raster walls, doors, stairs or nonbookable areas in this pass.
- Add subtle depth around the building reference and refined SVG room overlays. Keep all room/status text outside decorative filter effects.
- Available room: pale green fill/gradient and green outline. Occupied: amber treatment plus Occupied text or a small patterned marker. Unknown/loading/error: neutral treatment and Unknown text; never a green availability fill.
- Selected room: yellow gradient and a stronger Forest outline plus a visible selection marker. Selected and occupied can coexist: selection styling must not hide the Occupied label/marker.
- Pointer dragging remains on empty space. Room clicks/keyboard activation select rooms. Wheel, pinch, zoom buttons and Fit building retain their existing behavior. Do not add a toolbar that implies geometry editing or a hand/select mode that is not implemented.
- A compact bottom toolbar groups zoom out, an accurately computed zoom percentage, zoom in and Fit building. Give it a white elevated surface; keep the availability legend separate and unobtrusive.
- Keep initial fit and recovery predictable. Selecting a room or opening an inspector must not unexpectedly reset a manually adjusted pan/zoom position.

### Room inspector

- White panel with a pale green/yellow header treatment, room name as the strongest text, type/floor below, and a clear capacity/status strip.
- Booking cards prioritize start/end time, class code and subject. Show lab identity, instructor, course/year and units readably without inventing missing metadata for legacy/activity records.
- Preserve draft/published distinctions, inactive-instructor warnings, empty/loading/error states and the current permission-dependent create/edit/publish actions.
- Keep an actionable empty state. Public users can sign in; registrars can create a meeting. Instructor accounts remain view-only.
- Restyle the current daily schedule only. The planned weekly timetable has its own task and is not silently added to this visual pass.

### Dialogs and forms

- Apply the same typography, input, button, notice and elevation tokens to booking, academic setup and account/security dialogs.
- Improve the booking progress indicator, section spacing and Review summary. Keep the five-step flow and all current fields/validation.
- Retain native dialog focus handling, Escape behavior, error announcements and pending states. Keep authentication setup keys, passwords and codes out of decorative previews or logs.

## Responsive behavior

| Width | Proposed behavior |
| --- | --- |
| 1280px and above | Dock controls at about 264–280px and inspector at about 336–352px. At 1440px the selected-state canvas remains at least approximately 56% of the workspace width. Each panel scrolls independently. |
| 1024–1279px | Controls narrow to approximately 240px. Selected-room inspector becomes a closable nonmodal overlay up to 320px inside the canvas side, preserving the current pan/zoom state. |
| 768–1023px | Controls open from a labeled Filters/Rooms button; room details use a bottom sheet. Opening one mobile-style panel closes the other, so they do not stack over the entire map. |
| Below 768px | Compact header and essential floor/search controls above the map. Additional filters/room list open on demand. Selected-room sheet has a short room/status summary and an explicit Expand/Collapse control; expanded height is capped at about 65dvh. Fit/zoom controls remain reachable with the sheet collapsed. |

Use explicit button-controlled sheet states rather than adding a gesture library. Sheet expansion is presentation state; it does not change the selected room or schedule filters. At 390px, controls must fit without horizontal page scrolling. On-screen keyboards and long subject names must not hide the active input or final form action.

## Motion, accessibility and performance

- Use short 120–180ms transitions for hover, selection and panel expansion. Avoid entrance sequences, animated gradients, map parallax, continuous SVG filters and moving room labels.
- Respect reduced motion. Keep panning direct; do not run it through Lenis/GSAP. Existing document scrolling must not intercept map or dialog gestures.
- WCAG contrast targets: 4.5:1 normal text and 3:1 large text/control boundaries. Verify focus against white, green and yellow surfaces.
- Interactive targets are approximately 44px on touch screens. Icon-only actions require visible tooltips or accessible labels; no meaning depends on hover alone.
- Preserve keyboard room selection and an accessible list alternative. Closing a panel/dialog returns focus to its initiating control when possible. Nonmodal inspectors must not trap focus.
- No new animation, component or icon dependency. Do not fetch new visual reference assets or regenerate the building. Keep gradients in CSS/SVG, and clip their effects away from labels.

## Scope and acceptance

This changes presentation and small layout states only: responsive control panels, sheet expansion, secondary action overflow and zoom readout. It does not change database schema, authorization, scheduling rules, imports, AI, floor geometry or the weekly-view scope.

Validate public, instructor, registrar and administrator views. Compare 1440x900, 1280x800, 1024x768, 768x1024 and 390x844 layouts. Test selected/unselected rooms, occupied/available/unknown states, long subject titles, empty results, draft visibility, pending/error forms, map gestures, Fit building and keyboard focus. Inspect a wide and narrow screenshot after implementation. Run lint, tests and production build after the final code changes.

## Proposed implementation files

- New `app/explore/workspace.css`: tokens and scoped workspace/dialog presentation; replace superseded workspace selectors instead of adding another pile of overrides to `app/globals.css`.
- Modify `app/explore/workspace.tsx`: layout groups, accessible toolbar/floor switch, zoom readout, responsive inspector/navigation states. Keep current role/data/action integration.
- Small shared `app/explore/ui-icons.tsx` for the few required SVG icons, if existing local icons cannot be reused.
- Modify `app/explore/staff-ui.tsx`, `academic-setup.tsx` and `account-ui.tsx` only where scoped presentation classes are necessary. Preserve concurrent security work.
- Load the stylesheet through a small `app/explore/layout.tsx` if needed. Read the installed Next.js route/layout/CSS guides before implementing that change.
- Optional self-hosted font files and license in `public/fonts/`; retain a build-safe fallback.

The builder can choose exact gradient angles, icon paths and minor spacing after browser inspection. The core palette, map-first hierarchy, light surfaces, preserved geometry and unchanged role/scheduling boundaries are fixed by this design.
