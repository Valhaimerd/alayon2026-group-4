"use client";
import { useActionState } from "react";
import { Modal } from "./staff-ui";
import { createSection, createTerm, linkInstructor } from "./setup-actions";
import type { AdminData } from "../../lib/rooms";
import type { ActionResult } from "./actions";

function Result({ state }: { state: ActionResult }) {
  return state && <p role={state.ok ? "status" : "alert"} className={state.ok ? "notice" : "notice error"}>{state.message}</p>;
}

export default function AcademicSetup({ data, onClose }: { data: AdminData; onClose: () => void }) {
  const [term, termAction, termPending] = useActionState(createTerm, null);
  const [section, sectionAction, sectionPending] = useActionState(createSection, null);
  const [instructor, instructorAction, instructorPending] = useActionState(linkInstructor, null);
  return <Modal open onClose={onClose} title="Academic setup">
    <p className="muted small">Administrator access. Use the department&apos;s actual dates and section names. The BSIT catalog is provisional; unresolved electives and NSTP entries remain inactive.</p>
    <details open>
      <summary>Academic terms ({data.terms.length})</summary>
      {data.terms.map(t => <p className="small" key={t.id}>{t.name} · Semester {t.semester} · {t.starts_on} to {t.ends_on}</p>)}
      <form action={termAction} className="stack">
        <Result state={term} />
        <label>Term name<input name="name" required maxLength={80} placeholder="e.g. AY 2026–2027, first semester" /></label>
        <label>Semester<select name="semester"><option value="1">First</option><option value="2">Second</option></select></label>
        <div className="field-pair"><label>First date<input type="date" name="starts" required /></label><label>Last date<input type="date" name="ends" required /></label></div>
        <button disabled={termPending}>{termPending ? "Creating…" : "Create term"}</button>
      </form>
    </details>
    <details>
      <summary>Class sections ({data.sections.length})</summary>
      {data.sections.map(s => <p className="small" key={s.id}>{s.name} · Year {s.year_level} · {data.terms.find(t => t.id === s.term_id)?.name}</p>)}
      <form action={sectionAction} className="stack">
        <Result state={section} />
        <label>Academic term<select name="term" required defaultValue=""><option value="" disabled>Choose term</option>{data.terms.map(t => <option value={t.id} key={t.id}>{t.name}</option>)}</select></label>
        <label>Section name<input name="name" required maxLength={80} placeholder="e.g. BSIT 1A" /></label>
        <label>Year level<select name="year">{[1, 2, 3, 4].map(y => <option key={y} value={y}>{y}</option>)}</select></label>
        <label>Track<select name="track"><option value="">Not yet selected</option>{["Data Network Track", "Software Development Track", "Information Management Track"].map(t => <option key={t}>{t}</option>)}</select></label>
        <p className="muted small">Track choices are recorded for the section. Track subjects remain unavailable until their elective placement is reviewed.</p>
        <button disabled={sectionPending || !data.terms.length}>{sectionPending ? "Creating…" : "Create section"}</button>
      </form>
    </details>
    <details>
      <summary>Instructor accounts ({data.profiles.length})</summary>
      {data.profiles.map(p => <p className="small" key={p.id}>{p.instructor_code || "Legacy, no account"} · {p.name} · {p.active ? "Active" : "Inactive"}</p>)}
      <p className="muted small">Create and confirm the account in Supabase Authentication first, then link it here. To deactivate or reactivate an account, enter its email/code/name again and change Active. No history is deleted.</p>
      <form action={instructorAction} className="stack" onReset={e => e.preventDefault()}>
        <Result state={instructor} />
        <label>Existing account email<input name="email" type="email" required autoComplete="off" /></label>
        <label>Instructor code<input name="code" required maxLength={40} /></label>
        <label>Display name<input name="name" required maxLength={100} /></label>
        <label className="check"><input name="active" type="checkbox" defaultChecked />Active and assignable</label>
        <button disabled={instructorPending}>{instructorPending ? "Saving…" : "Link or update instructor"}</button>
      </form>
    </details>
  </Modal>;
}
