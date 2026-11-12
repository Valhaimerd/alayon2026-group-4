"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverClient } from "../../lib/supabase";
import { validateBooking } from "../../lib/booking-validation";
import { sendScheduleChange } from "../../lib/sms";

function result(message: string): never {
  redirect(`/staff?message=${encodeURIComponent(message)}`);
}
export async function login(form: FormData) {
  const db = await serverClient();
  const { error } = await db.auth.signInWithPassword({
    email: String(form.get("email")),
    password: String(form.get("password")),
  });
  if (error) result("Sign-in failed. Check your email and password.");
  redirect("/staff");
}
export async function logout() {
  const db = await serverClient();
  await db.auth.signOut();
  redirect("/staff");
}
export async function saveBooking(form: FormData) {
  const db = await serverClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) result("Sign in first.");
  const { data: staff } = await db
    .from("staff_members")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!staff) result("This account does not have staff access.");
  const roomId = String(form.get("room"));
  const title = String(form.get("title")).trim();
  const start = String(form.get("start")) + ":00+08:00",
    end = String(form.get("end")) + ":00+08:00";
  const size = Number(form.get("size"));
  const { data: room } = await db
    .from("rooms")
    .select("capacity")
    .eq("id", roomId)
    .single();
  if (!room) result("Choose a valid room.");
  const invalid = validateBooking({ start, end, size }, room.capacity);
  if (invalid) result(invalid);
  if (!title || title.length > 200)
    result("Enter a title of at most 200 characters.");
  const instructorId = String(form.get("instructor")) || null;
  const { data: instructor } = instructorId
    ? await db
        .from("instructors")
        .select("name")
        .eq("id", instructorId)
        .single()
    : { data: null };
  if (instructorId && !instructor) result("Choose a valid instructor.");
  const row = {
    room_id: roomId,
    title,
    starts_at: start,
    ends_at: end,
    class_size: size,
    instructor_id: instructorId,
    instructor_name: instructor?.name || "Unassigned",
    published: form.get("published") === "on",
  };
  const id = String(form.get("id") || "");
  const { error } = id
    ? await db.from("bookings").update(row).eq("id", id).select("id").single()
    : await db.from("bookings").insert(row).select("id").single();
  if (error)
    result(
      error.code === "23P01"
        ? "This room already has a published booking at that time."
        : "Could not save. Check capacity and try again.",
    );
  if (id) {
    const { data: pending } = await db
      .from("sms_notifications")
      .select("id")
      .eq("booking_id", id)
      .eq("state", "pending");
    for (const notice of pending || []) await dispatchNotice(notice.id);
  }
  revalidatePath("/");
  revalidatePath("/staff");
  result("Schedule saved. Check notifications for any published changes.");
}
async function dispatchNotice(id: string) {
  if (process.env.HATURIKOSMS_SEND_ENABLED !== "true") return;
  const db = await serverClient();
  const { data: notice } = await db
    .from("sms_notifications")
    .select("*")
    .eq("id", id)
    .single();
  if (!notice || !["pending", "failed"].includes(notice.state)) return;
  const { data: booking } = await db
    .from("bookings")
    .select("published,starts_at,title,instructor_id,room_id")
    .eq("id", notice.booking_id)
    .single();
  const { data: room } = booking
    ? await db.from("rooms").select("name").eq("id", booking.room_id).single()
    : { data: null };
  if (
    !booking?.published ||
    booking.starts_at !== notice.starts_at ||
    booking.title !== notice.title ||
    booking.instructor_id !== notice.instructor_id ||
    room?.name !== notice.room_name
  ) {
    await db
      .from("sms_notifications")
      .update({ state: "superseded" })
      .eq("id", id);
    return;
  }
  // Provider idempotency retention is 24 hours. Old uncertain attempts need manual reconciliation.
  if (Date.now() - Date.parse(notice.created_at) > 23 * 3600000) return;
  const { data: instructor } = await db
    .from("instructors")
    .select("phone,consent")
    .eq("id", notice.instructor_id)
    .single();
  if (!instructor?.phone || !instructor.consent) return;
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
  } catch {
    await db.from("sms_notifications").update({ state: "failed" }).eq("id", id);
  }
}
export async function retryNotice(form: FormData) {
  await dispatchNotice(String(form.get("id")));
  revalidatePath("/staff");
  redirect("/staff");
}
export async function saveInstructor(form: FormData) {
  const db = await serverClient();
  const name = String(form.get("name")).trim();
  const phone = String(form.get("phone")).trim();
  if (!name || name.length > 100 || (phone && !/^(\+63|0)9\d{9}$/.test(phone)))
    result("Enter a name and a valid Philippine mobile number.");
  const { error } = await db.from("instructors").insert({
    name,
    phone: phone || null,
    consent: form.get("consent") === "on",
  });
  if (error) result("Could not save instructor. Staff access is required.");
  revalidatePath("/staff");
  result("Instructor saved.");
}
