import type { Metadata } from "next";
import Workspace from "./workspace";
import { serverClient } from "../../lib/supabase";
import type { Booking, StaffData } from "../../lib/rooms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Building explorer · CISC SchedFlow" };

const local = (value: string) =>
  new Date(Date.parse(value) + 8 * 3600000).toISOString();

type Row = {
  id: string;
  room_id: string;
  title: string;
  instructor_name: string;
  starts_at: string;
  ends_at: string;
  published?: boolean;
  instructor_id?: string | null;
  class_size?: number;
};
const toBooking = (b: Row): Booking => ({
  id: b.id,
  roomId: b.room_id,
  title: b.title,
  instructor: b.instructor_name,
  date: local(b.starts_at).slice(0, 10),
  start: local(b.starts_at).slice(11, 16),
  end: local(b.ends_at).slice(11, 16),
  published: b.published,
  instructorId: b.instructor_id,
  classSize: b.class_size,
});

export default async function Explore({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; signin?: string }>;
}) {
  const params = await searchParams;
  const requested = params.date;
  const initialDate =
    requested &&
    /^\d{4}-\d{2}-\d{2}$/.test(requested) &&
    Number.isFinite(Date.parse(requested))
      ? requested
      : new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  const openSignIn = params.signin === "1";
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
    return <Workspace initialDate={initialDate} />;

  const db = await serverClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  const { data: membership } = user
    ? await db
        .from("staff_members")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };
  const account = !user ? null : membership ? "staff" : "nonstaff";
  const start = new Date(Date.parse(`${initialDate}T00:00:00+08:00`));
  const end = new Date(start.getTime() + 86400000);

  if (account === "staff") {
    // Staff see drafts and private fields. This data is only sent to staff sessions.
    const columns =
      "id,room_id,title,instructor_name,starts_at,ends_at,published,instructor_id,class_size";
    const [day, recent, instructors, notices] = await Promise.all([
      db
        .from("bookings")
        .select(columns)
        .gte("starts_at", start.toISOString())
        .lt("starts_at", end.toISOString())
        .order("starts_at")
        .range(0, 999),
      db
        .from("bookings")
        .select(columns)
        .order("starts_at", { ascending: false })
        .limit(100),
      db.from("instructors").select("id,name").order("name"),
      db
        .from("sms_notifications")
        .select("id,title,room_name,starts_at,state")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    const staff: StaffData = {
      instructors: instructors.data || [],
      notices: (notices.data || []).map((n) => ({
        id: n.id,
        title: n.title,
        roomName: n.room_name,
        startsAt: local(n.starts_at).slice(0, 16).replace("T", " "),
        state: n.state,
      })),
      recent: (recent.data || []).map(toBooking),
      smsEnabled: process.env.HATURIKOSMS_SEND_ENABLED === "true",
    };
    return (
      <Workspace
        initialDate={initialDate}
        publishedBookings={(day.data || []).map(toBooking)}
        loadError={!!day.error}
        account="staff"
        staff={staff}
      />
    );
  }

  const data: Row[] = [];
  let error = false;
  for (let offset = 0; ; offset += 500) {
    const page = await db
      .from("published_schedule")
      .select("*")
      .gte("starts_at", start.toISOString())
      .lt("starts_at", end.toISOString())
      .order("starts_at")
      .order("id")
      .range(offset, offset + 499);
    if (page.error) {
      error = true;
      break;
    }
    data.push(...page.data);
    if (page.data.length < 500) break;
  }
  return (
    <Workspace
      initialDate={initialDate}
      publishedBookings={data.map(toBooking)}
      loadError={error}
      account={account}
      openSignIn={openSignIn && !user}
    />
  );
}
