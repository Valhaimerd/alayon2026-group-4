"use server";
import { refresh } from "next/cache";
import { accountSession } from "../../lib/account-session";
import { isScheduleDate } from "../../lib/booking-validation";
import { CURRICULUM_ID } from "../../lib/curriculum";
import type { ActionResult } from "./actions";

async function administrator() {
  const { db, user, error } = await accountSession();
  if (error || !user) return null;
  const { data } = await db.rpc("has_role", { required_role: "administrator" });
  return data === true ? db : null;
}
const denied = { ok: false, message: "Administrator access is required." };

export async function createTerm(_: ActionResult, form: FormData): Promise<ActionResult> {
  const db = await administrator();
  if (!db) return denied;
  const name = String(form.get("name") || "").trim();
  const starts_on = String(form.get("starts"));
  const ends_on = String(form.get("ends"));
  const semester = Number(form.get("semester"));
  if (!name || name.length > 80 || !isScheduleDate(starts_on) || !isScheduleDate(ends_on) || ends_on < starts_on || ![1, 2].includes(semester))
    return { ok: false, message: "Enter a term name, semester and valid first/last dates." };
  const { error } = await db.from("academic_terms").insert({ name, starts_on, ends_on, semester });
  if (error) return { ok: false, message: error.code === "23505" ? "That term name already exists." : "Could not create the term." };
  refresh();
  return { ok: true, message: "Academic term created." };
}

export async function createSection(_: ActionResult, form: FormData): Promise<ActionResult> {
  const db = await administrator();
  if (!db) return denied;
  const name = String(form.get("name") || "").trim();
  const year_level = Number(form.get("year"));
  const track = String(form.get("track") || "") || null;
  if (!name || name.length > 80 || !Number.isInteger(year_level) || year_level < 1 || year_level > 4)
    return { ok: false, message: "Enter a section name and a year level from 1 to 4." };
  const { error } = await db.from("class_sections").insert({ name, year_level, track,
    term_id: String(form.get("term")), curriculum_id: CURRICULUM_ID });
  if (error) return { ok: false, message: error.code === "23505" ? "That section already exists in this term." : "Choose a valid term and track." };
  refresh();
  return { ok: true, message: "Class section created." };
}

export async function linkInstructor(_: ActionResult, form: FormData): Promise<ActionResult> {
  const db = await administrator();
  if (!db) return denied;
  const { error } = await db.rpc("provision_instructor", {
    p_email: String(form.get("email") || ""), p_code: String(form.get("code") || ""),
    p_name: String(form.get("name") || ""), p_active: form.get("active") === "on",
  });
  if (error) return { ok: false, message: error.message.includes("confirm this account")
    ? "Create and confirm this account in Supabase Auth first."
    : "Could not link the instructor. Check the name, account and unique instructor code." };
  refresh();
  return { ok: true, message: "Instructor account linked. Existing history was preserved." };
}
