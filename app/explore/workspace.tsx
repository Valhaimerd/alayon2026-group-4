"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  demoBookings,
  rooms,
  roomStatus,
  type Booking,
  type StaffData,
} from "../../lib/rooms";
import { logout } from "./actions";
import { BookingWizard, NoticesMenu, PublishToggle, SignInDialog } from "./staff-ui";

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
}: {
  publishedBookings?: Booking[];
  loadError?: boolean;
  initialDate?: string;
  account?: "staff" | "nonstaff" | null;
  staff?: StaffData;
  openSignIn?: boolean;
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
  const [time, setTime] = useState("09:00");
  const [view, setView] = useState(fitView);
  const [signInOpen, setSignInOpen] = useState(openSignIn);
  const [showDrafts, setShowDrafts] = useState(true);
  const [tab, setTab] = useState<"rooms" | "bookings">("rooms");
  // null: schedule view; "new": blank form; Booking: editing that booking.
  const [editing, setEditing] = useState<Booking | "new" | null>(null);
  const [message, setMessage] = useState("");
  const drag = useRef<{ x: number; y: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);

  const statusFor = (id: string) =>
    loadError || isPending || !date || !time
      ? "Unknown"
      : roomStatus(id, date, time, scheduleData);
  const active = rooms.find((r) => r.id === selected);
  const visible = rooms.filter(
    (r) =>
      r.floor === floor &&
      `${r.name} ${r.kind}`.toLowerCase().includes(search.toLowerCase()),
  );
  const bookings = scheduleData
    .filter(
      (b) =>
        b.roomId === selected &&
        b.date === date &&
        (b.published !== false || (isStaff && showDrafts)),
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
    setEditing(null);
    setMessage("");
  }
  function openBooking(b: Booking) {
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
            {isDemo ? "Demo schedules" : isStaff ? "Staff view" : "Published schedules"}
          </span>
          <a href="/">About</a>
          {isStaff && <NoticesMenu notices={staff.notices} smsEnabled={staff.smsEnabled} />}
          {account === "nonstaff" && <span className="account-note">No staff access</span>}
          {account ? (
            <form action={logout}>
              <button>Sign out</button>
            </form>
          ) : (
            !isDemo && (
              <button className="link-button" onClick={() => setSignInOpen(true)}>
                Staff sign in
              </button>
            )
          )}
        </div>
      </header>
      <div className="workspace">
        <aside className="controls" aria-label="Map controls">
          <p className="section-label">Building explorer</p>
          <h1>Find your room.</h1>
          <p className="muted">Explore the building and see what’s on.</p>
          <label>
            Floor
            <select
              value={floor}
              onChange={(e) => {
                setFloor(Number(e.target.value));
                setSelected(null);
                setEditing(null);
              }}
            >
              {floors.map((f, i) => (
                <option key={f} value={i}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <div className="date-controls">
            <label>
              Date
              <input type="date" value={date} onChange={(e) => goToDate(e.target.value)} />
            </label>
            <label>
              Time
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
          </div>
          <label>
            Search rooms
            <input
              type="search"
              placeholder="Room name or type"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
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
                    onClick={() => choose(r.id)}
                  >
                    <span>
                      <strong>{r.name}</strong>
                      <small>
                        {r.kind} · {r.capacity} seats
                      </small>
                    </span>
                    <span
                      className={`status-dot ${statusFor(r.id).toLowerCase()}`}
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
              <strong>CISC building</strong>
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
                    data-room={r.id}
                    className={`map-room ${selected === r.id ? "selected" : ""} ${status.toLowerCase()}`}
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
                    <rect x={r.x + 5} y={r.y + 5} width={r.width - 10} height={r.height - 10} rx="3" />
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
                Available
              </span>
              <span>
                <i className="occupied" />
                Occupied
              </span>
              <span>Gray areas are not bookable</span>
            </div>
            <div className="zoom-controls">
              <button aria-label="Zoom out" onClick={() => zoom(1.2)}>
                −
              </button>
              <button onClick={() => setView(fitView)}>Fit building</button>
              <button aria-label="Zoom in" onClick={() => zoom(0.8)}>
                +
              </button>
            </div>
          </div>
        </section>
        {active && (
          <aside className="details" aria-label="Selected room">
            <button
              className="close-panel"
              onClick={() => {
                setSelected(null);
                setEditing(null);
              }}
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
                  <div className="room-facts">
                    <span>
                      <strong>{active.capacity}</strong> seats
                    </span>
                    <span className="status-badge">
                      {statusFor(active.id)} at {time}
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
                    {isDemo ? "Sample data" : isStaff ? (showDrafts ? "Published and drafts" : "Published") : "Published"}
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
                      Sign in to manage schedules
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
          time={time}
          instructors={staff.instructors}
          onCancel={() => setEditing(null)}
          onDone={(text, savedDate) => {
            setEditing(null);
            setMessage(text);
            if (savedDate !== date) goToDate(savedDate);
          }}
        />
      )}
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
