"use server";
import { refresh } from "next/cache";
import { serverClient } from "../../lib/supabase";
import {
  expandSchedule,
  validateBooking,
} from "../../lib/booking-validation";
import { sendScheduleChange } from "../../lib/sms";
import { accountSession } from "../../lib/account-session";

export type ActionResult = { ok: boolean; message: string; id?: string } | null;

const fail = (message: string): ActionResult => ({ ok: false, message });

// Every staff mutation re-checks the session and membership on the server;
// database policies remain the final access boundary.
async function staffClient() {
  const { db, user, error } = await accountSession();
  if (error || !user) return { db, error: error || "Sign in first." };
  const { data: staff } = await db
    .from("account_roles")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("role", "registrar")
    .maybeSingle();
  return { db, error: staff ? null : "Registrar access is required." };
}

function saveError(error: { code?: string; message?: string }) {
  if (error.code === "23P01")
    return error.message?.includes("instructor_no_overlap")
      ? "This instructor already has a published class at that time."
      : "This room already has a published booking at that time.";
  if (error.message?.includes("capacity"))
    return "Class size exceeds room capacity.";
  if (error.code === "23514")
    return "Check the date, times, and class size. Bookings must start and end on the same day.";
  for (const message of [
    "Choose an active instructor with a confirmed account",
    "Every meeting must fall within the academic term dates",
    "Choose an active component belonging to the subject and section",
    "Subject year, semester and track must match the section",
    "Map this legacy class to a subject and instructor before republishing or editing",
    "Choose a valid section", "Choose a valid subject offering",
  ]) if (error.message?.includes(message)) return `${message}.`;
  return "Could not save. Check your selections and try again.";
}

export async function login(_: ActionResult, form: FormData): Promise<ActionResult> {
  const db = await serverClient();
  const { data, error } = await db.auth.signInWithPassword({
    email: String(form.get("email")),
    password: String(form.get("password")),
  });
  if (error || !data.user)
    return fail("Sign-in failed. Check your email and password.");
  refresh();
  return { ok: true, message: "Signed in." };
}

export async function logout() {
  const db = await serverClient();
  await db.auth.signOut();
}

export async function saveBooking(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { db, error: denied } = await staffClient();
  if (denied) return fail(denied);
  const roomId = String(form.get("room"));
  const title = String(form.get("title") ?? "").trim();
  const id = String(form.get("id") || "");
  let schedule: unknown;
  try {
    schedule = JSON.parse(String(form.get("schedule")));
  } catch {
    return fail("Choose the days and times again.");
  }
  // Editing changes one existing booking; series are created as separate occurrences.
  if (id && (!schedule || typeof schedule !== "object" || !("mode" in schedule) || schedule.mode !== "once"))
    return fail("An existing booking can only be moved to one date.");
  const expanded = expandSchedule(schedule);
  if ("error" in expanded) return fail(expanded.error);
  const size = Number(form.get("size"));
  const { data: room } = await db
    .from("rooms")
    .select("capacity")
    .eq("id", roomId)
    .maybeSingle();
  if (!room) return fail("Choose a valid room.");
  const slots = expanded.occurrences.map((o) => ({
    start: `${o.date}T${o.start}:00+08:00`,
    end: `${o.date}T${o.end}:00+08:00`,
  }));
  for (const s of slots) {
    const invalid = validateBooking({ ...s, size }, room.capacity);
    if (invalid) return fail(invalid);
  }
  const kind = String(form.get("kind") || "class");
  const instructorId = String(form.get("instructor") || "");
  const published = form.get("published") === "on";
  let error: { code?: string; message?: string } | null = null;
  let savedCount = 0;
  if (kind === "class") {
    const result = await db.rpc("save_class_booking", {
      p_id: id || null, p_section: String(form.get("section") || ""),
      p_parent: String(form.get("parent") || ""), p_component: String(form.get("component") || ""),
      p_class_code: String(form.get("classCode") || ""), p_instructor: instructorId,
      p_room: roomId, p_size: size, p_published: published, p_slots: slots,
    });
    error = result.error;
    savedCount = result.data || 0;
  } else if (kind === "activity") {
    if (!title || title.length > 200) return fail("Enter an activity of at most 200 characters.");
    const rows = slots.map(s => ({ ...{ starts_at: s.start, ends_at: s.end }, kind: "activity",
      title, room_id: roomId, class_size: size, published,
      instructor_id: null, instructor_name: "Department activity", offering_id: null, component_code: null,
    }));
    const result = id
      ? await db.from("bookings").update(rows[0]).eq("id", id).select("id")
      : await db.from("bookings").insert(rows).select("id");
    error = result.error;
    savedCount = result.data?.length || 0;
  } else return fail("Choose Class or Department activity.");
  if (error || !savedCount)
    return fail(
      error
        ? `${saveError(error)}${slots.length > 1 ? " No classes in this series were saved." : ""}`
        : "Could not save. Try again.",
    );
  let notice = "";
  if (id) {
    const { data: pending } = await db
      .from("sms_notifications")
      .select("id")
      .eq("booking_id", id)
      .eq("state", "pending");
    for (const n of pending || []) notice = ` ${await dispatchNotice(n.id)}`;
  }
  refresh();
  const what = slots.length > 1 ? `${slots.length} classes` : "Booking";
  return {
    ok: true,
    message: `${published ? `${what} saved and published.` : `${what} saved as draft. Not public until published.`}${notice}`,
  };
}

export async function setPublished(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { db, error: denied } = await staffClient();
  if (denied) return fail(denied);
  const publish = form.get("publish") === "true";
  const { error } = await db
    .from("bookings")
    .update({ published: publish })
    .eq("id", String(form.get("id")))
    .select("id")
    .single();
  if (error) return fail(saveError(error));
  refresh();
  return {
    ok: true,
    message: publish ? "Booking published." : "Booking unpublished. It is no longer public.",
  };
}

// Returns a staff-facing outcome. A provider acceptance means queued, not delivered.
async function dispatchNotice(id: string): Promise<string> {
  if (process.env.HATURIKOSMS_SEND_ENABLED !== "true")
    return "SMS sending is disabled on this server; the instructor notice stays pending.";
  const db = await serverClient();
  const { data: notice } = await db
    .from("sms_notifications")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!notice) return "Notice not found.";
  if (!["pending", "failed"].includes(notice.state))
    return `This notice is already ${notice.state}.`;
  const { data: booking } = await db
    .from("bookings")
    .select("published,starts_at,title,instructor_id,room_id")
    .eq("id", notice.booking_id)
    .maybeSingle();
  const { data: room } = booking
    ? await db.from("rooms").select("name").eq("id", booking.room_id).maybeSingle()
    : { data: null };
  if (
    !booking?.published ||
    Date.parse(booking.starts_at) !== Date.parse(notice.starts_at) ||
    booking.title !== notice.title ||
    booking.instructor_id !== notice.instructor_id ||
    room?.name !== notice.room_name
  ) {
    await db.from("sms_notifications").update({ state: "superseded" }).eq("id", id);
    return "The booking changed since this notice was created, so it was superseded.";
  }
  // Provider idempotency retention is 24 hours. Old uncertain attempts need manual reconciliation.
  if (Date.now() - Date.parse(notice.created_at) > 23 * 3600000)
    return "This notice is older than 23 hours. Contact the instructor directly.";
  const { data: instructor } = await db
    .from("instructors")
    .select("phone,consent")
    .eq("id", notice.instructor_id)
    .maybeSingle();
  if (!instructor?.phone || !instructor.consent)
    return "The instructor has no consenting mobile number.";
  try {
    const site = process.env.NEXT_PUBLIC_SITE_URL;
    if (!site || !site.startsWith("https://"))
      throw new Error("Configure a production schedule link first");
    const { messageId } = await sendScheduleChange({
      to: instructor.phone,
      course: notice.title,
      room: notice.room_name,
      time: new Date(notice.starts_at).toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
      }),
      scheduleUrl: site,
      eventId: notice.id,
    });
    await db
      .from("sms_notifications")
      .update({ state: "queued", provider_id: messageId })
      .eq("id", id);
    return "Instructor notice queued. Queued does not confirm delivery.";
  } catch {
    await db.from("sms_notifications").update({ state: "failed" }).eq("id", id);
    return "Sending the instructor notice failed. The booking stays published; retry later.";
  }
}

export async function retryNotice(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { error: denied } = await staffClient();
  if (denied) return fail(denied);
  const message = await dispatchNotice(String(form.get("id")));
  refresh();
  return { ok: message.startsWith("Instructor notice queued"), message };
}
