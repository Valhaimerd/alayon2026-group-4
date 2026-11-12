"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  demoBookings,
  rooms,
  type Booking,
  type StaffData,
  type AdminData,
} from "../../lib/rooms";
import AcademicSetup from "./academic-setup";
import { BookingWizard, NoticesMenu, PublishToggle, SignInDialog } from "./staff-ui";
import { AccountSettings, VerifySignIn, type AccountProfile } from "./account-ui";

const floors = ["Ground floor", "Second floor"];
const fitView = { x: -70, y: -30, width: 1676, height: 1117 };
const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? id;

export default function Workspace({
  publishedBookings,
  loadError = false,
  initialDate = "2026-11-12",
  account = null,
  staff,
  openSignIn = false,
  administration,
  assignments,
  assignmentsError = false,
  accessError = false,
  profile,
}: {
  publishedBookings?: Booking[];
  loadError?: boolean;
  initialDate?: string;
  account?: "staff" | "nonstaff" | "instructor" | "administrator" | null;
  staff?: StaffData;
  administration?: AdminData;
  assignments?: Booking[];
  assignmentsError?: boolean;
  accessError?: boolean;
  openSignIn?: boolean;
  profile?: AccountProfile;
}) {
  const scheduleData = publishedBookings ?? demoBookings;
  const isDemo = publishedBookings === undefined;
  const isStaff = account === "staff" && !!staff;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [floor, setFloor] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(initialDate);
  const [view, setView] = useState(fitView);
  const [signInOpen, setSignInOpen] = useState(openSignIn);
  const [showDrafts, setShowDrafts] = useState(true);
  const [tab, setTab] = useState<"rooms" | "bookings">("rooms");
  // null: schedule view; "new": blank form; Booking: editing that booking.
  const [editing, setEditing] = useState<Booking | "new" | null>(null);
  const [message, setMessage] = useState("");
  const [setupOpen, setSetupOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const svgId = useId().replace(/:/g, "");
  const filterButton = useRef<HTMLButtonElement>(null);
  const roomTriggers = useRef(new Map<string, HTMLElement | SVGElement>());
  function closeInspector() {
    setSelected(null); setEditing(null);
    if (selected) roomTriggers.current.get(selected)?.focus();
  }
  const drag = useRef<{ x: number; y: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);

  const dayBookings = scheduleData.filter(b => b.date === date &&
    (b.published !== false || ((isStaff || account === "instructor") && showDrafts)));
  const statusFor = (id: string) => loadError || isPending || !date
    ? "Unknown"
    : dayBookings.some(b => b.roomId === id) ? "Scheduled" : "No bookings";
  const statusClass = (status: string) => status === "Scheduled" ? "occupied" : status === "No bookings" ? "available" : "unknown";
  const active = rooms.find((r) => r.id === selected);
  const visible = rooms.filter(
    (r) =>
      r.floor === floor &&
      (`${r.name} ${r.kind}`.toLowerCase().includes(search.trim().toLowerCase()) ||
        dayBookings.some(b => b.roomId === r.id && `${b.title} ${b.subjectName ?? ""} ${b.subjectCode ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()))),
  );
  const bookings = dayBookings
    .filter(
      (b) =>
        b.roomId === selected &&
        b.date === date,
    )
    .sort((a, b) => a.start.localeCompare(b.start));

  function goToDate(value: string) {
    setDate(value);
    if (value && !isDemo)
      startTransition(() =>
        router.replace(`/explore?date=${value}`, { scroll: false }),
      );
  }
  function zoom(factor: number) {
    setView((v) => {
      const width = Math.max(500, Math.min(3500, v.width * factor));
      const height = (width * 2) / 3;
      return {
        x: v.x + (v.width - width) / 2,
        y: v.y + (v.height - height) / 2,
        width,
        height,
      };
    });
  }
  function choose(id: string) {
    setSelected(id);
    setFiltersOpen(false);
    setSheetExpanded(false);
    setEditing(null);
    setMessage("");
  }
  function openBooking(b: Booking) {
    setFiltersOpen(false);
    const room = rooms.find((r) => r.id === b.roomId);
    if (room) setFloor(room.floor);
    setSelected(b.roomId);
    if (b.date !== date) goToDate(b.date);
    setEditing(b);
    setMessage("");
  }
  function newBooking() {
    setEditing("new");
    setMessage("");
  }

  const editingBooking = editing && editing !== "new" ? editing : null;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand-link" href="/" aria-label="CISC SchedFlow welcome page">
          <div className="brand-mark" aria-hidden="true">
            S
          </div>
          <div>
            <strong>CISC SchedFlow</strong>
            <span>Room & class scheduling</span>
          </div>
        </a>
        <div className="topbar-end">
          <span className="demo-pill">
            {isDemo ? "Demo schedules" : account ? "Your workspace" : "Published schedules"}
          </span>
          <details className="workspace-more" onKeyDown={e => { if (e.key === "Escape") { e.currentTarget.open = false; e.currentTarget.querySelector("summary")?.focus(); } }}><summary>More</summary><div><a href="/">About SchedFlow</a>{administration && <button onClick={() => setSetupOpen(true)}>Academic setup</button>}</div></details>
          {isStaff && <NoticesMenu notices={staff.notices} smsEnabled={staff.smsEnabled} />}
          {profile ? (profile.needsVerification ? <VerifySignIn profile={profile} /> : <AccountSettings profile={profile} />) : (
            !isDemo && (
              <button className="topbar-signin" onClick={() => setSignInOpen(true)}>
                Sign in
              </button>
            )
          )}
        </div>
      </header>
      <div className="mobile-tools">
        <button ref={filterButton} aria-expanded={filtersOpen} aria-controls="workspace-controls" onClick={() => setFiltersOpen(v => !v)}>Filters & rooms</button>
        <span>{floors[floor]}</span>
      </div>
      <div className={`workspace ${active ? "has-selection" : ""}`}>
        <aside id="workspace-controls" className={`controls ${filtersOpen ? "is-open" : ""}`} aria-label="Map controls" onKeyDown={e => { if (e.key === "Escape") { setFiltersOpen(false); filterButton.current?.focus(); } }}>
          <button className="mobile-close" onClick={() => { setFiltersOpen(false); filterButton.current?.focus(); }}>Close filters</button>
          <p className="section-label">Building explorer</p>
          <h1>Find your room.</h1>
          <p className="muted">Explore the building and see what’s on.</p>
          <div className="floor-switch" role="group" aria-label="Floor">
            {floors.map((f, i) => <button key={f} aria-pressed={floor === i} onClick={() => { setFloor(i); setSelected(null); setEditing(null); }}>{i === 0 ? "Ground floor" : "Second floor"}</button>)}
          </div>
          <div className="date-controls">
            <label>
              Date
              <input type="date" value={date} onChange={(e) => goToDate(e.target.value)} />
            </label>
          </div>
          <label>
            Search rooms or subjects
            <input
              type="search"
              placeholder="Room, subject name or code"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          {accessError && <p role="alert">Account roles could not be loaded. Apply the reviewed academic migration before using these tools.</p>}
          {isStaff && staff.setupError && <p role="alert">Academic setup could not be loaded. Refresh or check the database migration.</p>}
          {assignments && <section aria-label="My assignments"><h2>My assignments</h2><p className="muted small">View only. Includes your own drafts; registrars manage changes. Showing the 100 most recent meetings.</p>
            {assignmentsError ? <p role="alert">Your assignments could not be loaded. <button onClick={() => router.refresh()}>Try again</button></p> : !assignments.length && <p>No assignments yet.</p>}
            {!assignmentsError && assignments.map(b => <button className="room-item" key={b.id} onClick={() => {
              const room = rooms.find(r => r.id === b.roomId); if (room) setFloor(room.floor);
              setSelected(b.roomId); setFiltersOpen(false); setSheetExpanded(true); goToDate(b.date);
            }}><span><strong>{b.title}</strong><small>{b.date} {b.start}-{b.end} - {roomName(b.roomId)} - {b.published ? "Published" : "Draft"}</small></span></button>)}
          </section>}
          {isStaff && (
            <div className="staff-tools">
              <label className="check">
                <input
                  type="checkbox"
                  checked={showDrafts}
                  onChange={(e) => setShowDrafts(e.target.checked)}
                />
                Show drafts
              </label>
              <button className="primary" onClick={newBooking}>
                + New booking
              </button>
              <div className="tabs" role="group" aria-label="Sidebar list">
                <button aria-pressed={tab === "rooms"} onClick={() => setTab("rooms")}>
                  Rooms
                </button>
                <button aria-pressed={tab === "bookings"} onClick={() => setTab("bookings")}>
                  Bookings
                </button>
              </div>
            </div>
          )}
          {isStaff && tab === "bookings" ? (
            <>
              <div className="list-heading">
                <h2>Recent bookings</h2>
                <span>{staff.recent.length}</span>
              </div>
              <div className="room-list">
                {staff.recent
                  .filter((b) => showDrafts || b.published)
                  .map((b) => (
                    <button key={b.id} className="room-item" onClick={() => openBooking(b)}>
                      <span>
                        <strong>{b.title}</strong>
                        <small>
                          {roomName(b.roomId)} · {b.date} {b.start}–{b.end}
                        </small>
                      </span>
                      <span className={`tag ${b.published ? "published" : "draft"}`}>
                        {b.published ? "Published" : "Draft"}
                      </span>
                    </button>
                  ))}
                {!staff.recent.length && <p>No bookings yet.</p>}
              </div>
            </>
          ) : (
            <>
              <div className="list-heading">
                <h2>Rooms</h2>
                <span>{visible.length}</span>
              </div>
              <div className="room-list">
                {visible.map((r) => (
                  <button
                    key={r.id}
                    aria-pressed={selected === r.id}
                    className="room-item"
                    ref={el => { if (el) roomTriggers.current.set(r.id, el); }}
                    onClick={() => choose(r.id)}
                  >
                    <span>
                      <strong>{r.name}</strong>
                      <small>
                        {r.kind} · {r.capacity} seats
                      </small>
                    </span>
                    <span
                      className={`status-dot ${statusClass(statusFor(r.id))}`}
                      aria-label={statusFor(r.id)}
                    />
                  </button>
                ))}
                {!visible.length && <p>No rooms match your search.</p>}
              </div>
            </>
          )}
          <p className="demo-note">
            Illustrative floor plans. Room names and capacities need verification.
            Times are Philippine time.
          </p>
        </aside>
        <section className="canvas-area" aria-label="Building floor plan">
          <div className="canvas-heading">
            <div>
              <strong>CISC building<span className="building-dot" aria-hidden="true" /></strong>
              <span>
                {floors[floor]} · {date}
              </span>
            </div>
            <span className="map-tag">Illustrative plan</span>
          </div>
          <svg
            className="floor-canvas"
            viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
            aria-label="Interactive floor plan. Use the room list for keyboard navigation."
            onWheel={(e) => {
              zoom(e.deltaY > 0 ? 1.1 : 0.9);
            }}
            onPointerDown={(e) => {
              if ((e.target as Element).closest("[data-room]")) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
              drag.current = { x: e.clientX, y: e.clientY };
            }}
            onPointerMove={(e) => {
              if (!pointers.current.has(e.pointerId)) return;
              pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
              if (pointers.current.size === 2) {
                const [a, b] = [...pointers.current.values()];
                const distance = Math.hypot(a.x - b.x, a.y - b.y);
                if (pinch.current) zoom(pinch.current / distance);
                pinch.current = distance;
                drag.current = null;
                return;
              }
              if (drag.current) {
                const bounds = e.currentTarget.getBoundingClientRect();
                const scale = Math.max(view.width / bounds.width, view.height / bounds.height);
                const dx = (e.clientX - drag.current.x) * scale;
                const dy = (e.clientY - drag.current.y) * scale;
                setView((v) => ({ ...v, x: v.x - dx, y: v.y - dy }));
                drag.current = { x: e.clientX, y: e.clientY };
              }
            }}
            onPointerUp={(e) => {
              pointers.current.delete(e.pointerId);
              drag.current = null;
              pinch.current = null;
            }}
            onPointerCancel={(e) => {
              pointers.current.delete(e.pointerId);
              drag.current = null;
              pinch.current = null;
            }}
          >
            <defs>
              <linearGradient id={`${svgId}-available`} x2="1" y2="1"><stop stopColor="#f0f7ed" /><stop offset="1" stopColor="#cce4d2" /></linearGradient>
              <linearGradient id={`${svgId}-selected`} x2="1" y2="1"><stop stopColor="#fff0ad" /><stop offset="1" stopColor="#f3c64e" /></linearGradient>
              <linearGradient id={`${svgId}-occupied`} x2="1" y2="1"><stop stopColor="#fff3d9" /><stop offset="1" stopColor="#efcf91" /></linearGradient>
            </defs>
            <image
              href={`/floor-plans/${floor === 0 ? "ground-floor" : "second-floor"}.png`}
              width="1536"
              height="1024"
              pointerEvents="none"
            />
            {rooms
              .filter((r) => r.floor === floor)
              .map((r) => {
                const status = statusFor(r.id);
                return (
                  <g
                    key={r.id}
                    ref={el => { if (el) roomTriggers.current.set(r.id, el); }}
                    data-room={r.id}
                    className={`map-room ${selected === r.id ? "selected" : ""} ${statusClass(status)}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${r.name}, ${status}, ${r.capacity} seats`}
                    aria-pressed={selected === r.id}
                    onClick={() => choose(r.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        choose(r.id);
                      }
                    }}
                  >
                    <rect style={{ fill: status === "Unknown" && selected !== r.id ? "#e4e9e6" : `url(#${svgId}-${selected === r.id ? "selected" : statusClass(status)})` }} x={r.x + 5} y={r.y + 5} width={r.width - 10} height={r.height - 10} rx="3" />
                    <text x={r.x + r.width / 2} y={r.y + r.height / 2 - 8} textAnchor="middle">
                      {r.name}
                    </text>
                    <text
                      className="map-status"
                      x={r.x + r.width / 2}
                      y={r.y + r.height / 2 + 22}
                      textAnchor="middle"
                    >
                      {status}
                    </text>
                  </g>
                );
              })}
          </svg>
          <div className="canvas-footer">
            <div className="legend">
              <span>
                <i className="available" />
                No bookings
              </span>
              <span>
                <i className="occupied" />
                Scheduled
              </span>
              <span>Gray areas are not bookable</span>
            </div>
            <div className="zoom-controls" role="group" aria-label="Map zoom">
              <button aria-label="Zoom out" onClick={() => zoom(1.2)}>
                −
              </button>
              <output aria-label="Zoom level">{Math.round(fitView.width / view.width * 100)}%</output>
              <button aria-label="Zoom in" onClick={() => zoom(0.8)}>
                +
              </button>
              <button className="fit-button" onClick={() => setView(fitView)}>Fit building</button>
            </div>
          </div>
        </section>
        {active && (
          <aside className={`details ${sheetExpanded ? "is-expanded" : ""}`} aria-label="Selected room" onKeyDown={e => { if (e.key === "Escape") { e.stopPropagation(); closeInspector(); } }}>
            <button className="sheet-toggle" aria-expanded={sheetExpanded} onClick={() => setSheetExpanded(v => !v)}>{sheetExpanded ? "Collapse schedule" : "View schedule"}</button>
            <button
              className="close-panel"
              onClick={closeInspector}
              aria-label="Close panel"
            >
              ×
            </button>
            {active && (
                <>
                  <p className="section-label">Selected room</p>
                  <h2>{active.name}</h2>
                  <p className="muted">
                    {floors[active.floor]} · {active.kind}
                  </p>
                  <p className="inspector-summary">{active.capacity} seats · {statusFor(active.id)}</p>
                  <div className="room-facts">
                    <span>
                      <strong>{active.capacity}</strong> seats
                    </span>
                    <span className={`status-badge ${statusClass(statusFor(active.id))}`}>
                      {statusFor(active.id)}
                    </span>
                  </div>
                  {message && (
                    <p role="status" className="notice">
                      {message}
                    </p>
                  )}
                  <div className="schedule-heading">
                    <h3>Schedule</h3>
                    {isStaff && (
                      <button className="primary small" onClick={newBooking}>
                        + New booking
                      </button>
                    )}
                  </div>
                  <p className="muted small">
                    {date} ·{" "}
                    {isDemo ? "Sample data" : isStaff ? (showDrafts ? "Published and drafts" : "Published") : account === "instructor" ? "Published and your assignments" : "Published"}
                  </p>
                  <div aria-live="polite">
                    {isPending && <p>Loading schedules…</p>}
                    {loadError && (
                      <p role="alert">
                        Schedules could not be loaded. Availability is unknown. Refresh to try again.
                      </p>
                    )}
                    {loadError || isPending ? null : bookings.length ? (
                      bookings.map((b) => (
                        <article className={`booking ${b.published === false ? "draft" : ""}`} key={b.id}>
                          <span>
                            {b.start} – {b.end}
                            {isStaff && (
                              <em className={`tag ${b.published ? "published" : "draft"}`}>
                                {b.published ? "Published" : "Draft"}
                              </em>
                            )}
                          </span>
                          <h4>{b.title}</h4>
                          {b.kind === "class" && <p>{b.subjectCode} - {b.subjectName}<br />Class {b.classCode} - {b.course} - Year {b.yearLevel} - {b.units} {b.units === 0 ? "additional lab units" : "units"}</p>}
                          {isStaff && b.kind === "legacy" && <p className="small">Legacy record: map its subject and account before republishing.</p>}
                          {isStaff && b.kind === "class" && !staff.instructors.some(i => i.id === b.instructorId) && <p className="notice">Instructor no longer assignable. Review future meetings and reassign before publishing.</p>}
                          <p>
                            {b.instructor}
                            {isStaff && b.classSize ? ` · ${b.classSize} students` : ""}
                          </p>
                          {isStaff && (
                            <div className="booking-actions">
                              <button onClick={() => openBooking(b)}>Edit</button>
                              <PublishToggle booking={b} />
                            </div>
                          )}
                        </article>
                      ))
                    ) : (
                      <div className="empty-state">
                        <strong>No classes scheduled</strong>
                        <p>
                          {isStaff
                            ? "No bookings for this room on this date."
                            : "No published bookings for this room on this date."}
                        </p>
                      </div>
                    )}
                  </div>
                  {!account && !isDemo && (
                    <button className="link-button staff-link" onClick={() => setSignInOpen(true)}>
                      Sign in to your account
                    </button>
                  )}
                </>
            )}
          </aside>
        )}
      </div>
      {isStaff && editing && (
        <BookingWizard
          key={editingBooking?.id ?? "new"}
          booking={editingBooking}
          roomId={selected ?? visible[0]?.id ?? rooms[0].id}
          date={date}
          time="09:00"
          instructors={staff.instructors}
          academic={staff}
          onCancel={() => setEditing(null)}
          onDone={(text, savedDate, savedRoom) => {
            setEditing(null);
            setFiltersOpen(false);
            setSheetExpanded(true);
            setMessage(text);
            setSelected(savedRoom);
            const room = rooms.find(r => r.id === savedRoom);
            if (room) setFloor(room.floor);
            if (savedDate !== date) goToDate(savedDate);
          }}
        />
      )}
      {administration && setupOpen && <AcademicSetup data={administration} onClose={() => setSetupOpen(false)} />}
      {!account && !isDemo && (
        <SignInDialog
          open={signInOpen}
          onClose={() => setSignInOpen(false)}
          onSignedIn={() => {
            setSignInOpen(false);
            router.replace(`/explore?date=${date}`, { scroll: false });
          }}
        />
      )}
    </main>
  );
}
