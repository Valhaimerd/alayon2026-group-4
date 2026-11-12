import Workspace from "./workspace";
import { createClient } from "@supabase/supabase-js";
import type { Booking } from "../lib/rooms";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const requested = (await searchParams).date;
  const initialDate =
    requested &&
    /^\d{4}-\d{2}-\d{2}$/.test(requested) &&
    Number.isFinite(Date.parse(requested))
      ? requested
      : new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
    return <Workspace initialDate={initialDate} />;
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const data = [];
  let error = false;
  const start = Date.parse(`${initialDate}T00:00:00+08:00`);
  for (let offset = 0; ; offset += 500) {
    const page = await db
      .from("published_schedule")
      .select("*")
      .gte("starts_at", new Date(start).toISOString())
      .lt("starts_at", new Date(start + 86400000).toISOString())
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
  const local = (value: string) =>
    new Date(Date.parse(value) + 8 * 3600000).toISOString();
  const bookings: Booking[] = (data || []).map((b) => ({
    id: b.id,
    roomId: b.room_id,
    title: b.title,
    instructor: b.instructor_name,
    date: local(b.starts_at).slice(0, 10),
    start: local(b.starts_at).slice(11, 16),
    end: local(b.ends_at).slice(11, 16),
  }));
  return (
    <Workspace
      initialDate={initialDate}
      publishedBookings={bookings}
      loadError={error}
    />
  );
}
