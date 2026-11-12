"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { demoBookings, rooms, roomStatus } from "../lib/rooms";

export default function Workspace({
  publishedBookings,
  loadError = false,
  initialDate = "2026-11-12",
}: {
  publishedBookings?: import("../lib/rooms").Booking[];
  loadError?: boolean;
  initialDate?: string;
}) {
  const scheduleData = publishedBookings ?? demoBookings;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const statusFor = (id: string) =>
    loadError || isPending || !date || !time
      ? "Unknown"
      : roomStatus(id, date, time, scheduleData);
  const isDemo = publishedBookings === undefined;
  const [floor, setFloor] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState("09:00");
  const [view, setView] = useState({
    x: -70,
    y: -30,
    width: 1676,
    height: 1117,
  });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const active = rooms.find((r) => r.id === selected);
  const visible = rooms.filter(
    (r) =>
      r.floor === floor &&
      `${r.name} ${r.kind}`.toLowerCase().includes(search.toLowerCase()),
  );
  const bookings = scheduleData
    .filter((b) => b.roomId === selected && b.date === date)
    .sort((a, b) => a.start.localeCompare(b.start));
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
  }
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">
          S
        </div>
        <div>
          <strong>CISC SchedFlow</strong>
          <span>Room & class scheduling</span>
        </div>
        <div className="topbar-end">
          <span className="demo-pill">
            {isDemo ? "Demo schedules" : "Published schedules"}
          </span>
          <a href="/welcome">About</a>
          <a href="/staff">Staff sign in</a>
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
              }}
            >
              {["Ground floor", "Second floor"].map((f, i) => (
                <option key={f} value={i}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <div className="date-controls">
            <label>
              Date
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  const value = e.target.value;
                  setDate(value);
                  if (value && !isDemo)
                    startTransition(() =>
                      router.replace(`/?date=${value}`, { scroll: false }),
                    );
                }}
              />
            </label>
            <label>
              Time
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
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
          <p className="demo-note">
            Illustrative floor plans. Room names and capacities need
            verification. Times are Philippine time.
          </p>
        </aside>
        <section className="canvas-area" aria-label="Building floor plan">
          <div className="canvas-heading">
            <div>
              <strong>CISC building</strong>
              <span>
                {floor === 0 ? "Ground floor" : "Second floor"} · {date}
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
                const scale = Math.max(
                  view.width / bounds.width,
                  view.height / bounds.height,
                );
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
                    <rect
                      x={r.x + 5}
                      y={r.y + 5}
                      width={r.width - 10}
                      height={r.height - 10}
                      rx="3"
                    />
                    <text
                      x={r.x + r.width / 2}
                      y={r.y + r.height / 2 - 8}
                      textAnchor="middle"
                    >
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
              <button
                onClick={() =>
                  setView({ x: -70, y: -30, width: 1676, height: 1117 })
                }
              >
                Fit building
              </button>
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
              onClick={() => setSelected(null)}
              aria-label="Close room details"
            >
              ×
            </button>
            <p className="section-label">Selected room</p>
            <h2>{active.name}</h2>
            <p className="muted">
              {active.floor === 0 ? "Ground floor" : "Second floor"} ·{" "}
              {active.kind}
            </p>
            <div className="room-facts">
              <span>
                <strong>{active.capacity}</strong> seats
              </span>
              <span className="status-badge">
                {statusFor(active.id)} at {time}
              </span>
            </div>
            <h3>Schedule</h3>
            <p className="muted">
              {date} · {isDemo ? "Sample data" : "Published"}
            </p>
            <div aria-live="polite">
              {isPending && <p>Loading schedules…</p>}
              {loadError && (
                <p role="alert">
                  Schedules could not be loaded. Availability is unknown.
                  Refresh to try again.
                </p>
              )}
              {loadError || isPending ? null : bookings.length ? (
                bookings.map((b) => (
                  <article className="booking" key={b.id}>
                    <span>
                      {b.start} – {b.end}
                    </span>
                    <h4>{b.title}</h4>
                    <p>{b.instructor}</p>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <strong>No classes scheduled</strong>
                  <p>No published bookings for this room on this date.</p>
                </div>
              )}
            </div>
            <a className="staff-link" href="/staff">
              Sign in to manage schedules
            </a>
          </aside>
        )}
      </div>
    </main>
  );
}

