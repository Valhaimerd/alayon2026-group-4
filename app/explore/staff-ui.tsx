"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import {
  login,
  retryNotice,
  saveBooking,
  saveInstructor,
  setPublished,
  type ActionResult,
} from "./actions";
import { rooms, type Booking, type Instructor, type Notice } from "../../lib/rooms";
import {
  expandSchedule,
  weekday,
  initialScheduleDays,
  isScheduleDate,
  type ScheduleInput,
  type TimeRange,
} from "../../lib/booking-validation";

// Native <dialog> provides focus trapping, Escape to close, and focus return.
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog ref={ref} className="modal" aria-labelledby={titleId} onClose={onClose}>
      <div className="modal-head">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="close-panel" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}

function Status({ state }: { state: ActionResult }) {
  if (!state) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={state.ok ? "notice" : "notice error"}>
      {state.message}
    </p>
  );
}

export function SignInDialog({
  open,
  onClose,
  onSignedIn,
}: {
  open: boolean;
  onClose: () => void;
  onSignedIn: (message: string) => void;
}) {
  const [state, action, pending] = useActionState(
    async (prev: ActionResult, form: FormData) => {
      const result = await login(prev, form);
      if (result?.ok) onSignedIn(result.message);
      return result;
    },
    null,
  );
  return (
    <Modal open={open} onClose={onClose} title="Staff sign in">
      <form action={action} className="stack">
        <Status state={state?.ok ? null : state} />
        <label>
          Email
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className="primary" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
        <p className="muted small">Staff accounts are provisioned by the department administrator.</p>
      </form>
    </Modal>
  );
}

export function NoticesMenu({ notices, smsEnabled }: { notices: Notice[]; smsEnabled: boolean }) {
  const [state, action, pending] = useActionState(retryNotice, null);
  const attention = notices.filter((n) => n.state === "failed" || n.state === "pending").length;
  return (
    <>
      <button className="notices-button" popoverTarget="notices-popover">
        Notifications
        {attention > 0 && (
          <span className="count" aria-label={`${attention} need attention`}>
            {attention}
          </span>
        )}
      </button>
      <div id="notices-popover" popover="auto" className="notices-popover">
        <h2>Instructor notices</h2>
        <p className="muted small">
          {smsEnabled
            ? "Queued means the provider accepted the message, not that it was delivered."
            : "SMS sending is disabled on this server. Notices stay pending until it is enabled."}
        </p>
        <Status state={state} />
        {notices.length ? (
          <ul>
            {notices.map((n) => (
              <li key={n.id}>
                <span>
                  <strong>{n.title}</strong>
                  <small>
                    {n.roomName} · {n.startsAt}
                  </small>
                </span>
                <span className={`state ${n.state}`}>{n.state}</span>
                {(n.state === "pending" || n.state === "failed") && (
                  <form action={action}>
                    <input type="hidden" name="id" value={n.id} />
                    <button disabled={pending}>Retry</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">No notices yet.</p>
        )}
      </div>
    </>
  );
}

export function PublishToggle({ booking }: { booking: Booking }) {
  const [state, action, pending] = useActionState(setPublished, null);
  return (
    <form action={action} className="inline-form">
      <input type="hidden" name="id" value={booking.id} />
      <input type="hidden" name="publish" value={booking.published ? "false" : "true"} />
      <button disabled={pending}>
        {pending ? "Saving…" : booking.published ? "Unpublish" : "Publish"}
      </button>
      {state && !state.ok && <Status state={state} />}
    </form>
  );
}

function InstructorDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const [state, action, pending] = useActionState(
    async (prev: ActionResult, form: FormData) => {
      const result = await saveInstructor(prev, form);
      if (result?.ok && result.id) onSaved(result.id);
      return result;
    },
    null,
  );
  return (
    <Modal open={open} onClose={onClose} title="Add instructor">
      <form action={action} className="stack">
        <Status state={state?.ok ? null : state} />
        <label>
          Name
          <input name="name" required maxLength={100} />
        </label>
        <label>
          Mobile number (optional)
          <input name="phone" type="tel" placeholder="09XXXXXXXXX" autoComplete="off" />
        </label>
        <label className="check">
          <input name="consent" type="checkbox" />
          Instructor agreed to schedule notices
        </label>
        <button className="primary" disabled={pending}>
          {pending ? "Saving…" : "Save instructor"}
        </button>
      </form>
    </Modal>
  );
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const STEPS = ["Class", "Days", "Time", "Room", "Review"];
const DURATIONS = [60, 90, 120, 180];
const minutesOf = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const addMinutes = (time: string, minutes: number) => {
  const total = Math.min(23 * 60 + 59, minutesOf(time) + minutes);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};
const addDays = (date: string, days: number) =>
  !isScheduleDate(date) ? "" : new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);
const longDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

function TimeFields({
  value,
  onChange,
  label,
}: {
  value: TimeRange;
  onChange: (v: TimeRange) => void;
  label?: string;
}) {
  return (
    <fieldset className="time-fields">
      {label && <legend>{label}</legend>}
      <div className="field-pair">
        <label>
          Starts
          <input
            type="time"
            value={value.start}
            required
            onChange={(e) => {
              const start = e.target.value;
              // Keep the class length when the start time moves.
              const length = minutesOf(value.end) - minutesOf(value.start);
              onChange({
                start,
                end: start ? addMinutes(start, length > 0 ? length : 90) : value.end,
              });
            }}
          />
        </label>
        <label>
          Ends
          <input
            type="time"
            value={value.end}
            required
            onChange={(e) => onChange({ ...value, end: e.target.value })}
          />
        </label>
      </div>
      <div className="chips" role="group" aria-label="Class length">
        {DURATIONS.map((m) => (
          <button
            type="button"
            key={m}
            aria-pressed={!!value.start && value.end === addMinutes(value.start, m)}
            onClick={() => onChange({ ...value, end: addMinutes(value.start, m) })}
          >
            {m / 60} h
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function BookingWizard({
  booking,
  roomId,
  date,
  time,
  instructors,
  onDone,
  onCancel,
}: {
  booking: Booking | null;
  roomId: string;
  date: string;
  time: string;
  instructors: Instructor[];
  onDone: (message: string, date: string) => void;
  onCancel: () => void;
}) {
  const editing = !!booking;
  const startDate = booking?.date ?? date;
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [title, setTitle] = useState(booking?.title ?? "");
  const [instructor, setInstructor] = useState(booking?.instructorId ?? "");
  const [size, setSize] = useState(String(booking?.classSize ?? 30));
  const [mode, setMode] = useState<"once" | "weekly">(editing ? "once" : "weekly");
  const [onceDate, setOnceDate] = useState(startDate);
  const [from, setFrom] = useState(startDate);
  const [until, setUntil] = useState(addDays(startDate, 7 * 16 - 1));
  const [days, setDays] = useState<number[]>(initialScheduleDays(startDate));
  const [sameTime, setSameTime] = useState(true);
  const [shared, setShared] = useState<TimeRange>({
    start: booking?.start ?? time,
    end: booking?.end ?? addMinutes(time, 90),
  });
  const [perDay, setPerDay] = useState<Record<number, TimeRange>>({});
  const [room, setRoom] = useState(booking?.roomId ?? roomId);
  const [publish, setPublish] = useState(booking?.published ?? false);
  const [adding, setAdding] = useState(false);

  const schedule: ScheduleInput = {
    mode,
    date: onceDate,
    from,
    until,
    days,
    times:
      mode === "once"
        ? { [weekday(onceDate || startDate)]: shared }
        : Object.fromEntries(
            days.map((d) => [d, sameTime ? shared : (perDay[d] ?? shared)]),
          ),
  };
  const expanded = expandSchedule(schedule);
  const occurrences = "occurrences" in expanded ? expanded.occurrences : [];
  const seats = Number(size);
  const chosenRoom = rooms.find((r) => r.id === room);

  const [state, action, pending] = useActionState(
    async (prev: ActionResult, form: FormData) => {
      const result = await saveBooking(prev, form);
      if (result?.ok) onDone(result.message, occurrences[0]?.date ?? date);
      return result;
    },
    null,
  );

  useEffect(() => {
    if (error || state?.ok === false) errorRef.current?.focus();
  }, [error, state]);

  // Returns the first problem that blocks moving to the target step.
  function check(target: number): string {
    if (target > 0) {
      if (!title.trim()) return "Enter the course or activity.";
      if (!Number.isInteger(seats) || seats < 1)
        return "Enter a class size of at least 1.";
    }
    if (target > 1) {
      if (mode === "once" && !isScheduleDate(onceDate)) return "Choose a valid date.";
      if (mode === "weekly" && !days.length) return "Choose at least one day of the week.";
      if (mode === "weekly" && (!isScheduleDate(from) || !isScheduleDate(until) || until < from))
        return "Choose a first date and a last date on or after it.";
    }
    if (target > 2 && "error" in expanded) return expanded.error;
    if (target > 3 && (!chosenRoom || chosenRoom.capacity < seats))
      return "Choose a room with enough seats.";
    return "";
  }
  function goTo(target: number) {
    const problem = target > step ? check(target) : "";
    setError(problem);
    if (!problem) setStep(target);
  }

  return (
    <Modal open onClose={onCancel} title={editing ? "Edit booking" : "New booking"}>
      <ol className="steps" aria-label="Booking steps">
        {STEPS.map((s, i) => (
          <li
            key={s}
            aria-current={i === step ? "step" : undefined}
            className={i < step ? "done" : ""}
          >
            <button type="button" onClick={() => goTo(i)} disabled={pending || i > step + 1}>
              <span aria-hidden="true">{i + 1}</span> {s}
            </button>
          </li>
        ))}
      </ol>
      <form
        className="wizard-body"
        action={action}
        // Successful saves close the dialog; failed saves must retain every choice.
        onReset={(e) => e.preventDefault()}
        onSubmit={(e) => {
          // Enter advances through the steps; only the Review step saves.
          if (step < STEPS.length - 1) {
            e.preventDefault();
            goTo(step + 1);
          }
        }}
      >
        <input type="hidden" name="id" value={booking?.id ?? ""} />
        <input type="hidden" name="title" value={title} />
        <input type="hidden" name="instructor" value={instructor} />
        <input type="hidden" name="size" value={size} />
        <input type="hidden" name="room" value={room} />
        <input type="hidden" name="schedule" value={JSON.stringify(schedule)} />
        {(error || (state && !state.ok)) && (
          <p ref={errorRef} tabIndex={-1} role="alert" className="notice error">
            {error || state?.message}
          </p>
        )}

        {step === 0 && (
          <div className="stack">
            <h3>What is being scheduled?</h3>
            <label>
              Course or activity
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="e.g. CS 211 Data Structures"
                autoFocus
              />
            </label>
            <div className="field-row">
              <label>
                Instructor
                <select value={instructor} onChange={(e) => setInstructor(e.target.value)}>
                  <option value="">Unassigned</option>
                  {instructors.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="add-instructor" onClick={() => setAdding(true)}>
                + Add
              </button>
            </div>
            <label>
              Class size
              <input type="number" min="1" value={size} onChange={(e) => setSize(e.target.value)} />
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="stack">
            <h3>When does it meet?</h3>
            <div className="segmented" role="radiogroup" aria-label="Repeat">
              <button
                type="button"
                role="radio"
                aria-checked={mode === "weekly"}
                disabled={editing}
                onClick={() => setMode("weekly")}
              >
                Weekly
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={mode === "once"}
                onClick={() => setMode("once")}
              >
                One date
              </button>
            </div>
            {editing && <p className="muted small">Editing changes this one class only.</p>}
            {mode === "once" ? (
              <label>
                Date
                <input type="date" value={onceDate} onChange={(e) => setOnceDate(e.target.value)} />
              </label>
            ) : (
              <>
                <fieldset>
                  <legend>Days of the week</legend>
                  <div className="chips days">
                    {DAY_ORDER.map((d) => (
                      <button
                        type="button"
                        key={d}
                        aria-pressed={days.includes(d)}
                        onClick={() =>
                          setDays((all) =>
                            all.includes(d) ? all.filter((x) => x !== d) : [...all, d],
                          )
                        }
                      >
                        {WEEKDAYS[d]}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div className="field-pair">
                  <label>
                    First date
                    <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                  </label>
                  <label>
                    Last date
                    <input
                      type="date"
                      value={until}
                      min={from}
                      onChange={(e) => setUntil(e.target.value)}
                    />
                  </label>
                </div>
                <div className="chips" role="group" aria-label="Series length">
                  {[1, 8, 16, 18].map((w) => (
                    <button
                      type="button"
                      key={w}
                      disabled={!isScheduleDate(from)}
                      aria-pressed={!!from && until === addDays(from, 7 * w - 1)}
                      onClick={() => setUntil(addDays(from, 7 * w - 1))}
                    >
                      {w === 1 ? "1 week" : `${w} weeks`}
                    </button>
                  ))}
                </div>
                <p className="muted small" aria-live="polite">
                  {"error" in expanded && days.length
                    ? expanded.error
                    : `${occurrences.length} ${occurrences.length === 1 ? "class" : "classes"}`}
                </p>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="stack">
            <h3>What time?</h3>
            {mode === "weekly" && days.length > 1 && (
              <div className="segmented" role="radiogroup" aria-label="Times">
                <button
                  type="button"
                  role="radio"
                  aria-checked={sameTime}
                  onClick={() => setSameTime(true)}
                >
                  Same time every day
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={!sameTime}
                  onClick={() => {
                    setPerDay((p) =>
                      Object.fromEntries(days.map((d) => [d, p[d] ?? shared])),
                    );
                    setSameTime(false);
                  }}
                >
                  Different per day
                </button>
              </div>
            )}
            {mode === "once" || sameTime ? (
              <TimeFields value={shared} onChange={setShared} />
            ) : (
              DAY_ORDER.filter((d) => days.includes(d)).map((d) => (
                <TimeFields
                  key={d}
                  label={WEEKDAYS[d]}
                  value={perDay[d] ?? shared}
                  onChange={(v) => setPerDay((p) => ({ ...p, [d]: v }))}
                />
              ))
            )}
          </div>
        )}

        {step === 3 && (
          <div className="stack">
            <h3>Which room?</h3>
            <p className="muted small">
              Rooms with fewer than {seats} seats cannot hold this class.
            </p>
            <div className="room-choices" role="radiogroup" aria-label="Room">
              {rooms.map((r) => (
                <label key={r.id} className={`room-choice ${r.capacity < seats ? "too-small" : ""}`}>
                  <input
                    type="radio"
                    name="room-choice"
                    checked={room === r.id}
                    disabled={r.capacity < seats}
                    onChange={() => setRoom(r.id)}
                  />
                  <span>
                    <strong>{r.name}</strong>
                    <small>
                      {r.floor === 0 ? "Ground" : "Second"} floor · {r.capacity} seats
                    </small>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="stack">
            <h3>Review</h3>
            <dl className="summary">
              <dt>Class</dt>
              <dd>
                {title} · {seats} students
              </dd>
              <dt>Instructor</dt>
              <dd>{instructors.find((i) => i.id === instructor)?.name ?? "Unassigned"}</dd>
              <dt>Room</dt>
              <dd>{chosenRoom?.name}</dd>
              <dt>Schedule</dt>
              <dd>
                {occurrences.length === 1
                  ? `${longDate(occurrences[0].date)}, ${occurrences[0].start}–${occurrences[0].end}`
                  : `${occurrences.length} classes, ${longDate(from)} to ${longDate(until)}`}
              </dd>
            </dl>
            {occurrences.length > 1 && (
              <details>
                <summary>Show all dates</summary>
                <ul className="occurrences">
                  {occurrences.map((o) => (
                    <li key={o.date}>
                      {longDate(o.date)} · {o.start}–{o.end}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <label className="check">
              <input
                type="checkbox"
                name="published"
                checked={publish}
                onChange={(e) => setPublish(e.target.checked)}
              />
              Publish now (visible to everyone)
            </label>
            <p className="muted small">
              {publish
                ? "Conflicts with published bookings are checked on save. If any date conflicts, nothing is saved."
                : "Drafts are visible to staff only and can be published later."}
            </p>
          </div>
        )}

        <div className="form-actions wizard-actions">
          {step > 0 ? (
            <button type="button" disabled={pending} onClick={() => goTo(step - 1)}>
              Back
            </button>
          ) : (
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button className="primary" disabled={pending}>
            {step < STEPS.length - 1
              ? "Next"
              : pending
                ? "Saving…"
                : occurrences.length > 1
                  ? `Save ${occurrences.length} classes`
                  : "Save booking"}
          </button>
        </div>
      </form>
      <InstructorDialog
        open={adding}
        onClose={() => setAdding(false)}
        onSaved={(id) => {
          setInstructor(id);
          setAdding(false);
        }}
      />
    </Modal>
  );
}

