# Map workspace redesign implementation plan

> After design approval, execute inline using superpowers:executing-plans. Preserve changes from other active chats.

**Goal:** Make the existing map workspace visually polished in a light yellow/dark-green theme while keeping the building central and all scheduling/account behavior intact.

**Architecture:** Keep current React state, actions and SVG room geometry. Introduce scoped visual tokens and workspace styles, then make the smallest layout/state changes needed for responsive panels and a clear toolbar. Reuse existing native dialogs.

**Stack:** Installed Next.js 16.4.6, React 19.3.0, TypeScript and CSS/SVG. No new UI or animation dependency.

**Design:** [Map workspace visual redesign](../specs/2026-11-12-map-workspace-design.md). Status: approved; implementation and verification recorded below.

## Constraints

- Light surfaces, Forest/Leaf greens and Sunflower yellow, with the specific token values in the design.
- Preserve both floor references, room IDs/coordinates, pan/zoom/selection, schedule data and role boundaries.
- No geometry editing, database/schema changes, weekly-view implementation, placeholder import/AI actions or welcome-page restyling.
- Preserve current account/MFA work. Keep map/dialog gestures independent from smooth document scrolling.
- Use frontend-design as the primary design skill and ui-quality-loop for responsive/accessibility validation. Apply the project's React/Next.js guidance when editing components.

## Review focus

- Selection cannot erase an occupied/unknown state or imply availability when reads fail.
- Header actions must fit for combined administrator/registrar roles, not just public users.
- A narrow screen and expanded sheet must still offer a clear way back to the map and its controls.
- Responsive panel changes must not reset pan/zoom, selected room, filters or an in-progress form.
- Scoped styling must cover portaled/native dialogs without changing the welcome page or concealing form errors.

## 1. Establish the scoped visual system

Files: `app/explore/workspace.css`, optional `app/explore/layout.tsx`, targeted cleanup in `app/globals.css`, optional verified font/license assets in `public/fonts/`.

- [x] Read installed Next.js CSS/layout/font guidance and confirm the current files before editing.
- [x] Add the six base tokens, gradients, typography, form/control states and elevation/radius rules. Prefer system fallback if a self-hosted font cannot be bundled reliably.
- [x] Move or replace affected workspace selectors instead of stacking conflicting overrides. Keep shared account/security classes functional and make modal styling scope explicit.
- [x] Verify that `/` and `/welcome` retain the welcome design; `/explore` and its dialogs receive the new system.

## 2. Refine the desktop workspace and map

Files: `app/explore/workspace.tsx`, `app/explore/workspace.css`, optional `app/explore/ui-icons.tsx`.

- [x] Build the compact green header and white navigator/inspector with the dimensions in the design. Use meaningful icons with accessible names.
- [x] Group floor/search/date controls, refine selected/list states and retain every role-specific action.
- [x] Add static SVG room gradients and selection/occupancy/unknown markers without changing room geometry or raster references.
- [x] Add the grouped zoom/Fit toolbar. Derive zoom percentage from the current viewBox width relative to `fitView.width`; do not maintain a second zoom state.
- [x] Verify pointer and keyboard room selection, selection plus occupancy, unknown/loading state, zoom/Fit and long academic details at 1440x900 and 1280x800.

## 3. Adapt panels and dialogs

Files: `workspace.tsx`, `workspace.css`, targeted classes in `staff-ui.tsx`, `academic-setup.tsx`, `account-ui.tsx`.

- [x] Implement the 1024px overlay inspector, tablet filter drawer and mobile summary/expanded sheet using labeled controls and existing room/filter state.
- [x] Keep only one mobile overlay panel open at a time. Preserve the map view and restore focus on close where applicable; nonmodal inspectors do not trap focus.
- [x] Apply the visual system to wizard progress, Review summary, inputs, pending/error notices, setup and account dialogs without changing action contracts or authentication behavior.
- [x] Validate 1024x768, 768x1024 and 390x844 with long names, role-specific header actions, a keyboard-open input and an expanded sheet. Confirm no horizontal page overflow and usable zoom/Fit access when collapsed.

## 4. Validate and document

- [x] Use the existing agent-browser workflow for public, instructor and registrar/administrator screens. Use clearly labeled fixtures only if needed; do not send SMS or change account security to test styling.
- [x] Inspect desktop/mobile screenshots, text/control contrast, keyboard focus, reduced motion and selected/occupied/unknown states. Correct failures before delivery.
- [x] Run `npm run lint`, `npm test` and `npm run build` after final code changes. Behavior changes use meaningful browser checks; no snapshot tests that only mirror CSS.
- [x] Update `docs/DEVELOPMENT-STATUS.md` and task 17 with actual evidence and remaining limitations. Record whether source changes are local or deployed.

## Planning review

The independent builder check reported no important unanswered questions. Exact gradient angles, icon paths and minor spacing remain implementation decisions; the palette, map-first hierarchy, accessibility targets and unchanged scheduling/security boundaries are specified in the design.

## Implementation evidence

- Route-scoped `workspace.css` replaces the prior workspace styling; existing form/account rules live in `shared-controls.css`. Root globals contain only the minimal reset. The static welcome retains its own stylesheet.
- Manrope variable font and its OFL license are bundled locally; no runtime font CDN.
- Browser inspections covered public and combined registrar/administrator views at 1440x900, 1280x800, 1024x768, 768x1024 and 390x844. Screenshots inspected at desktop and mobile sizes. Instructor-only behavior remains covered by existing authorization logic; a separate instructor-only visual session was not performed.
- Actual mouse dragging changed the SVG viewBox, zoom updated to 125%, Fit restored the default view, and resizing preserved the zoomed viewBox. The 1024px inspector does not cover the toolbar. Mobile filters retain selection while hiding the inspector, and room selection closes filters. Sheet expand/collapse and sign-in dialog were exercised.
- Independent review identified hidden toolbar and mobile assignment drawer issues; both corrected. No SMS, database writes or account-security changes were needed for this visual pass.
- Lint, 12 unit tests and production build pass. Primary text/button palette pairs exceed 4.5:1; physical touch/pinch and exhaustive assistive-technology checks remain unverified.
- Parallel date/search behavior changes were preserved; their functional scope is separate from this visual work. Source changes remain local and have not been pushed in this task.
