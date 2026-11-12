import Link from "next/link";
import { serverClient } from "../../lib/supabase";
import {
  login,
  logout,
  saveBooking,
  saveInstructor,
  retryNotice,
} from "./actions";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; edit?: string }>;
}) {
  const params = await searchParams;
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
    return (
      <main className="staff-page">
        <Link href="/">Back to map</Link>
        <h1>Staff sign in</h1>
        <p>Database connection is not configured for this deployment.</p>
      </main>
    );
  const db = await serverClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  const { data: staff } = user
    ? await db
        .from("staff_members")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };
  if (!user)
    return (
      <main className="staff-page">
        <Link href="/">Back to map</Link>
        <h1>Staff sign in</h1>
        {params.message && <p role="status">{params.message}</p>}
        <form action={login}>
          <label>
            Email
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button>Sign in</button>
        </form>
        <p>Staff accounts are provisioned by the department administrator.</p>
      </main>
    );
  if (!staff)
    return (
      <main className="staff-page">
        <Link href="/">Back to map</Link>
        <h1>Staff access required</h1>
        <p>
          This account has no staff role. Ask the project administrator to
          provision access.
        </p>
        <form action={logout}>
          <button>Sign out</button>
        </form>
      </main>
    );
  const [
    { data: rooms },
    { data: instructors },
    { data: bookings },
    { data: notices },
  ] = await Promise.all([
    db.from("rooms").select("*").order("id"),
    db.from("instructors").select("id,name").order("name"),
    db
      .from("bookings")
      .select("*")
      .order("starts_at", { ascending: false })
      .limit(100),
    db
      .from("sms_notifications")
      .select("id,title,state")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const { data: edit } =
    params.edit && /^[0-9a-f-]{36}$/i.test(params.edit)
      ? await db
          .from("bookings")
          .select("*")
          .eq("id", params.edit)
          .maybeSingle()
      : { data: null };
  const local = (value?: string) =>
    value
      ? new Date(Date.parse(value) + 8 * 3600000).toISOString().slice(0, 16)
      : "";
  return (
    <main className="staff-dashboard">
      <header>
        <Link href="/">Back to building explorer</Link>
        <form action={logout}>
          <button>Sign out</button>
        </form>
      </header>
      <h1>Manage schedules</h1>
      {params.message && (
        <p role="status" className="notice">
          {params.message}
        </p>
      )}
      <div className="staff-grid">
        <section>
          <h2>{edit ? "Edit booking" : "New booking"}</h2>
          <p>
            One-time bookings · Philippine time. Published bookings are public.
          </p>
          <form key={edit?.id || "new"} action={saveBooking}>
            <input type="hidden" name="id" value={edit?.id || ""} />
            <label>
              Room
              <select name="room" defaultValue={edit?.room_id}>
                {rooms?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} · {r.capacity} seats
                  </option>
                ))}
              </select>
            </label>
            <label>
              Course or activity
              <input
                name="title"
                required
                maxLength={200}
                defaultValue={edit?.title}
              />
            </label>
            <label>
              Instructor
              <select
                name="instructor"
                defaultValue={edit?.instructor_id || ""}
              >
                <option value="">Unassigned</option>
                {instructors?.map((i) => (
                  <option value={i.id} key={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Starts
              <input
                type="datetime-local"
                name="start"
                required
                defaultValue={local(edit?.starts_at)}
              />
            </label>
            <label>
              Ends
              <input
                type="datetime-local"
                name="end"
                required
                defaultValue={local(edit?.ends_at)}
              />
            </label>
            <label>
              Class size
              <input
                type="number"
                min="1"
                name="size"
                required
                defaultValue={edit?.class_size || 20}
              />
            </label>
            <label className="check">
              <input
                type="checkbox"
                name="published"
                defaultChecked={edit?.published}
              />
              Publish this booking
            </label>
            <button>Save schedule</button>
            {edit && <Link href="/staff">Cancel edit</Link>}
          </form>
        </section>
        <section>
          <h2>Bookings</h2>
          <p>Showing the 100 most recent bookings.</p>
          {bookings?.map((b) => (
            <article className="booking" key={b.id}>
              <strong>{b.title}</strong>
              <p>
                {b.room_id} · {local(b.starts_at).replace("T", " ")} ·{" "}
                {b.published ? "Published" : "Draft"}
              </p>
              <Link href={`/staff?edit=${b.id}`}>Edit booking</Link>
            </article>
          ))}
          {!bookings?.length && <p>No bookings yet.</p>}
          <h2>Add instructor</h2>
          <form action={saveInstructor}>
            <label>
              Name
              <input name="name" required maxLength={100} />
            </label>
            <label>
              Mobile number
              <input name="phone" type="tel" placeholder="09XXXXXXXXX" />
            </label>
            <label className="check">
              <input name="consent" type="checkbox" />
              Instructor agreed to schedule notices
            </label>
            <button>Save instructor</button>
          </form>
          <h2>Notifications</h2>
          {notices?.map((n) => (
            <div key={n.id}>
              <p>
                {n.title}: {n.state}
              </p>
              {["pending", "failed"].includes(n.state) && (
                <form action={retryNotice}>
                  <input type="hidden" name="id" value={n.id} />
                  <button>Send notification</button>
                </form>
              )}
            </div>
          ))}
          <p>
            Sending is disabled unless the server is configured to enable SMS.
            Queued does not confirm delivery.
          </p>
        </section>
      </div>
    </main>
  );
}
