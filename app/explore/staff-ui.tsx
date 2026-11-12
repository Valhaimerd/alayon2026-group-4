"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import {
  login,
  retryNotice,
  saveBooking,
  setPublished,
  type ActionResult,
} from "./actions";
import { rooms, type Booking, type Instructor, type Notice, type AcademicData } from "../../lib/rooms";
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
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
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
    <dialog ref={ref} className={`modal ${className}`} aria-labelledby={titleId} onClose={onClose}>
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
  const [showPassword, setShowPassword] = useState(false);
  const [state, action, pending] = useActionState(
    async (prev: ActionResult, form: FormData) => {
      const result = await login(prev, form);
      if (result?.ok) onSignedIn(result.message);
      return result;
    },
    null,
  );
  return (
    <Modal open={open} onClose={onClose} title="Sign in" className="sign-in-modal">
      <div className="signin-emblem" aria-hidden="true">S<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z" /><path d="m8.5 11.5 2.5 2.5 4.5-5" /></svg></div>
      <p className="signin-intro">Welcome to CISC SchedFlow</p>
      <p className="signin-campus">Central Mindanao University<br />College of Information Sciences and Computing</p>
      <form action={action} className="signin-form">
        <Status state={state?.ok ? null : state} />
        <label htmlFor="signin-email">Email address</label>
        <div className="signin-input">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></svg>
          <input id="signin-email" name="email" type="email" autoComplete="username" placeholder="you@example.com" required />
        </div>
        <label htmlFor="signin-password">Password</label>
        <div className="signin-input">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg>
          <input id="signin-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required />
          <button type="button" className="password-visibility" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{showPassword && <path d="m3 3 18 18" />}</svg>
          </button>
        </div>
        <button className="primary signin-submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in to CISC SchedFlow"}<span aria-hidden="true">→</span>
        </button>
        <p className="signin-help">Use your account email and password.<br />Need access? Contact your account administrator.</p>
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
  academic,
  onDone,
  onCancel,
}: {
  booking: Booking | null;
  roomId: string;
  date: string;
  time: string;
  instructors: Instructor[];
  academic: AcademicData;
  onDone: (message: string, date: string, roomId: string) => void;
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
  const [kind, setKind] = useState<"class" | "activity">(booking?.kind === "activity" ? "activity" : "class");
  const [termId, setTermId] = useState(booking?.termId ?? "");
  const [sectionId, setSectionId] = useState(booking?.sectionId ?? "");
  const [classCode, setClassCode] = useState(booking?.classCode ?? "");
  const initialComponent = academic.components.find(c => c.code === booking?.subjectCode);
  const [parentCode, setParentCode] = useState(initialComponent?.parentCode ?? initialComponent?.code ?? "");
  const [componentCode, setComponentCode] = useState(initialComponent?.code ?? "");
  const term = academic.terms.find(t => t.id === termId);
  const section = academic.sections.find(s => s.id === sectionId && s.term_id === termId);
  const parent = academic.components.find(c => c.code === parentCode);
  const component = academic.components.find(c => c.code === componentCode);
  const subjectChoices = academic.components.filter(c => c.active && !c.parentCode && c.year === section?.year_level && c.semester === term?.semester);
  const components = academic.components.filter(c => c.active && (c.code === parentCode || c.parentCode === parentCode));
  const displayTitle = kind === "class" ? `${classCode} - ${component?.title ?? "Choose subject"}` : title;

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
      if (result?.ok) onDone(result.message, occurrences[0]?.date ?? date, room);
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
      if (kind === "activity" && !title.trim()) return "Enter the department activity.";
      if (kind === "class") {
        if (!term || !section) return "Choose an academic term and class section.";
        if (!classCode.trim() || classCode.trim().length > 40) return "Enter a class code of at most 40 characters.";
        if (!subjectChoices.some(c => c.code === parentCode) || !components.some(c => c.code === componentCode)) return "Choose an active subject and its component.";
        if (!instructors.some(i => i.id === instructor)) return "Choose an active instructor account. Ask the administrator to provision missing accounts.";
      }
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
    if (target > 2 && kind === "class" && term && occurrences.some(o => o.date < term.starts_on || o.date > term.ends_on))
      return "Every meeting must fall within the academic term dates.";
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
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="section" value={sectionId} />
        <input type="hidden" name="parent" value={parentCode} />
        <input type="hidden" name="component" value={componentCode} />
        <input type="hidden" name="classCode" value={classCode} />
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
            {booking?.kind === "legacy" && <p className="notice">Legacy booking. Select its actual subject and instructor account before saving it as a class.</p>}
            <label>Schedule type<select value={kind} onChange={e => setKind(e.target.value as "class" | "activity")}>
              <option value="class">Class</option><option value="activity">Department activity (no academic units)</option>
            </select></label>
            {kind === "activity" ? <label>Activity name<input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} /></label> : <>
              <p className="muted small">Predefined BSIT curriculum (provisional). Subject titles and units are read-only; unresolved electives, tracks and NSTP entries are unavailable.</p>
              {!academic.terms.length || !academic.sections.length ? <p role="status" className="notice">Ask the administrator to configure the actual term dates and class sections first.</p> : null}
              <label>Academic term<select value={termId} onChange={e => {
                setTermId(e.target.value); setSectionId(""); setParentCode(""); setComponentCode("");
                const next = academic.terms.find(t => t.id === e.target.value);
                if (next) { setFrom(next.starts_on); setUntil(next.ends_on); setOnceDate(next.starts_on); }
              }}><option value="">Choose term</option>{academic.terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
              <label>Class section<select value={sectionId} onChange={e => { setSectionId(e.target.value); setParentCode(""); setComponentCode(""); }}>
                <option value="">Choose section</option>{academic.sections.filter(s => s.term_id === termId).map(s => <option key={s.id} value={s.id}>{s.name} - Year {s.year_level}</option>)}
              </select></label>
              <label>Class code<input value={classCode} onChange={e => setClassCode(e.target.value)} maxLength={40} placeholder="Preserves leading zeros, e.g. 00123" /></label>
              <label>Subject<select value={parentCode} onChange={e => { setParentCode(e.target.value); setComponentCode(e.target.value); }}>
                <option value="">Choose approved subject</option>{subjectChoices.map(c => <option value={c.code} key={c.code}>{c.code} - {c.title}</option>)}
              </select></label>
              <label>Meeting component<select value={componentCode} onChange={e => setComponentCode(e.target.value)}>
                <option value="">Choose component</option>{components.map(c => <option value={c.code} key={c.code}>{c.parentCode ? "Lab" : "Lecture / main"} - {c.code}</option>)}
              </select></label>
              {component && <p className="notice">{component.title}<br />BSIT - Year {section?.year_level} - {component.units} {component.parentCode ? "additional lab units" : "units"}
                {component.parentCode && <><br />Linked to {parent?.code} - {parent?.title} ({parent?.units} parent units, counted once).</>}
              </p>}
              <label>Instructor account<select value={instructor} onChange={e => setInstructor(e.target.value)}>
                <option value="">Choose existing active instructor</option>{instructors.map(i => <option key={i.id} value={i.id}>{i.instructor_code} - {i.name}</option>)}
              </select></label>
              {!instructors.length && <p className="notice">No active instructor accounts. An administrator must link confirmed accounts before classes can be saved.</p>}
            </>}
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
            {kind === "class" && component?.parentCode && <p className="notice">Confirm the room meets this lab&apos;s requirements. Room capabilities and lab contact hours have not been verified.</p>}
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
                {displayTitle} · {seats} students
              </dd>
              <dt>Instructor</dt>
              <dd>{kind === "activity" ? "Department activity" : instructors.find(i => i.id === instructor)?.name ?? "Choose instructor"}</dd>
              {kind === "class" && <><dt>Academic</dt><dd>BSIT - Year {section?.year_level} - {component?.units} {component?.parentCode ? "additional lab units" : "units"}<br />{section?.name} - {term?.name}</dd></>}
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
                : "Drafts are visible to registrars and their assigned instructor. Publish when ready."}
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

    </Modal>
  );
}
