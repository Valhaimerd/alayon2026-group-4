import type { Metadata } from "next";
import Workspace from "./workspace";
import { accountSession } from "../../lib/account-session";
import type { AccountProfile } from "./account-ui";
import { isScheduleDate } from "../../lib/booking-validation";
import type { Booking, StaffData, AcademicData, AdminData } from "../../lib/rooms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Building explorer - CISC SchedFlow" };
const local = (value: string) => new Date(Date.parse(value) + 8 * 3600000).toISOString();
type Row = {
  id: string; room_id: string; title: string; instructor_name: string; starts_at: string; ends_at: string;
  published?: boolean; instructor_id?: string | null; class_size?: number;
  kind?: "legacy" | "class" | "activity"; class_code?: string | null; course?: string | null;
  units?: number | null; subject_code?: string | null; subject_name?: string | null;
  year_level?: number | null; term_id?: string | null; section_id?: string | null;
};
const toBooking = (b: Row): Booking => ({
  id: b.id, roomId: b.room_id, title: b.title, instructor: b.instructor_name,
  date: local(b.starts_at).slice(0, 10), start: local(b.starts_at).slice(11, 16), end: local(b.ends_at).slice(11, 16),
  published: b.published, instructorId: b.instructor_id, classSize: b.class_size,
  kind: b.kind, classCode: b.class_code, course: b.course, units: b.units,
  subjectCode: b.subject_code, subjectName: b.subject_name, yearLevel: b.year_level,
  termId: b.term_id, sectionId: b.section_id,
});

export default async function Explore({ searchParams }: { searchParams: Promise<{ date?: string; signin?: string }> }) {
  const params = await searchParams;
  const initialDate = isScheduleDate(params.date) ? params.date : new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    return <Workspace initialDate={initialDate} />;
  const { db, user, sms, needsVerification, error: sessionError } = await accountSession();
  const roleResult = user && !sessionError ? await db.from("account_roles").select("role").eq("user_id", user.id) : { data: [], error: null };
  const roles = (roleResult.data || []).map(r => r.role);
  const registrar = roles.includes("registrar");
  const admin = roles.includes("administrator");
  const instructor = roles.includes("instructor");
  const account = !user ? null : registrar ? "staff" : instructor ? "instructor" : admin ? "administrator" : "nonstaff";
  const profile: AccountProfile | undefined = user ? {
    email: user.email ?? "",
    name: typeof user.user_metadata.display_name === "string" ? user.user_metadata.display_name : "",
    role: registrar ? "Registrar" : instructor ? "Faculty" : admin ? "Administrator" : "Account holder",
    needsVerification,
    sms: sms ?? { enabled: false, phone: null, pending: null },
    factors: (user.factors ?? []).filter((factor) => factor.factor_type === "totp" && factor.status === "verified")
      .map((factor) => ({ id: factor.id, name: factor.friendly_name || "Authenticator" })),
  } : undefined;
  const start = new Date(`${initialDate}T00:00:00+08:00`);
  const end = new Date(start.getTime() + 86400000);
  const columns = "id,room_id,title,instructor_name,starts_at,ends_at,published,instructor_id,class_size,kind,class_code,course,units,subject_code,subject_name,year_level,term_id,section_id";

  async function loadDay(table: string, fields: string) {
    const rows: Row[] = [];
    for (let offset = 0; ; offset += 500) {
      const result = await db.from(table).select(fields).gte("starts_at", start.toISOString())
        .lt("starts_at", end.toISOString()).order("starts_at").order("id").range(offset, offset + 499);
      if (result.error) return { rows: [] as Row[], error: true };
      const page = result.data as unknown as Row[];
      rows.push(...page);
      if (page.length < 500) break;
    }
    return { rows, error: false };
  }
  const [published, privateDay, recent] = await Promise.all([
    loadDay("published_schedule", "*"),
    registrar || instructor ? loadDay("bookings", columns) : Promise.resolve({ rows: [] as Row[], error: false }),
    registrar || instructor ? db.from("bookings").select(columns).order("starts_at", { ascending: false }).order("id").limit(100) : Promise.resolve({ data: [], error: null }),
  ]);
  // Instructor private reads use RLS: only their own assignments, merged with the safe public projection.
  const rows = new Map(published.rows.map(b => [b.id, toBooking(b)]));
  for (const b of privateDay.rows) rows.set(b.id, toBooking(b));
  let academic: AcademicData = { components: [], terms: [], sections: [] };
  let setupError = false;
  if (registrar || admin) {
    const [components, terms, sections] = await Promise.all([
      db.from("subject_components").select("code,title,units,parent_code,year_level,semester,track,active").eq("curriculum_id", "bsit-provisional-2026").order("code"),
      db.from("academic_terms").select("*").order("starts_on", { ascending: false }),
      db.from("class_sections").select("*").order("name"),
    ]);
    academic = { components: (components.data || []).map(c => ({ code: c.code, title: c.title, units: c.units, parentCode: c.parent_code,
      year: c.year_level, semester: c.semester, track: c.track, active: c.active })), terms: terms.data || [], sections: sections.data || [] };
    setupError = !!(components.error || terms.error || sections.error);
  }
  let staff: StaffData | undefined;
  if (registrar) {
    const [instructors, notices] = await Promise.all([
      db.from("assignable_instructors").select("id,name,instructor_code").order("name"),
      db.from("sms_notifications").select("id,title,room_name,starts_at,state").order("created_at", { ascending: false }).limit(20),
    ]);
    staff = { ...academic, instructors: instructors.data || [], notices: (notices.data || []).map(n => ({ id: n.id, title: n.title,
      roomName: n.room_name, startsAt: local(n.starts_at).slice(0, 16).replace("T", " "), state: n.state })),
      recent: (recent.data || []).map(toBooking), smsEnabled: process.env.HATURIKOSMS_SEND_ENABLED === "true",
      setupError: setupError || !!(instructors.error || notices.error || recent.error) };
  }
  let administration: AdminData | undefined;
  if (admin) {
    const profiles = await db.from("instructors").select("id,name,instructor_code,active").order("name");
    administration = { ...academic, profiles: profiles.data || [] };
  }
  return <Workspace initialDate={initialDate} publishedBookings={[...rows.values()]} loadError={published.error || privateDay.error}
    account={account} profile={profile} staff={staff} administration={administration}
    assignments={instructor && !registrar ? (recent.data || []).map(toBooking) : undefined}
    assignmentsError={instructor && !registrar && !!recent.error}
    accessError={!!roleResult.error} openSignIn={params.signin === "1" && !user} />;
}
