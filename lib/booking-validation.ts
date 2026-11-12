export function validateBooking(
  input: { start: string; end: string; size: number },
  capacity: number,
): string | null {
  const start = Date.parse(input.start),
    end = Date.parse(input.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    return "The end must be after the start.";
  if (input.start.slice(0, 10) !== input.end.slice(0, 10))
    return "Use a booking that starts and ends on the same date.";
  if (!Number.isInteger(input.size) || input.size < 1 || input.size > capacity)
    return "Class size must be positive and within room capacity.";
  return null;
}

export type TimeRange = { start: string; end: string };
export type ScheduleInput = {
  mode: "once" | "weekly";
  date: string; // used when mode is "once"
  from: string; // first date of a weekly series
  until: string; // last date of a weekly series, inclusive
  days: number[]; // weekdays, 0 = Sunday … 6 = Saturday
  times: Record<string, TimeRange>; // keyed by weekday
};
export type Occurrence = { date: string } & TimeRange;

export const MAX_OCCURRENCES = 150;
export const isScheduleDate = (v: unknown): v is string =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  Number.isFinite(Date.parse(`${v}T00:00:00Z`)) &&
  new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
const isTime = (v: unknown): v is string =>
  typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
export const weekday = (date: string) =>
  new Date(`${date}T00:00:00Z`).getUTCDay();
export const initialScheduleDays = (date: string): number[] =>
  isScheduleDate(date) ? [weekday(date)] : [];

// Expands a one-time or weekly schedule into same-day occurrences.
export function expandSchedule(
  value: unknown,
): { occurrences: Occurrence[] } | { error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return { error: "Choose a valid schedule." };
  const input = value as Partial<ScheduleInput>;
  if (input.mode !== "once" && input.mode !== "weekly")
    return { error: "Choose a one-date or weekly schedule." };
  if (!input.times || typeof input.times !== "object" || Array.isArray(input.times))
    return { error: "Choose valid start and end times." };
  const timeFor = (day: number) => {
    const t = input.times?.[String(day)];
    if (!t || !isTime(t.start) || !isTime(t.end)) return null;
    return t.end > t.start ? t : null;
  };
  if (input.mode === "once") {
    if (!isScheduleDate(input.date)) return { error: "Choose a valid date." };
    const t = timeFor(weekday(input.date));
    if (!t) return { error: "Choose a start time and a later end time." };
    return { occurrences: [{ date: input.date, ...t }] };
  }
  if (!isScheduleDate(input.from) || !isScheduleDate(input.until) || input.until < input.from)
    return { error: "Choose a first date and a last date on or after it." };
  if (!Array.isArray(input.days) || input.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6))
    return { error: "Choose valid days of the week." };
  const days = [...new Set(input.days)];
  if (!days.length) return { error: "Choose at least one day of the week." };
  for (const d of days)
    if (!timeFor(d))
      return { error: "Each selected day needs a start time and a later end time." };
  const occurrences: Occurrence[] = [];
  for (
    let t = Date.parse(`${input.from}T00:00:00Z`);
    t <= Date.parse(`${input.until}T00:00:00Z`);
    t += 86400000
  ) {
    const date = new Date(t).toISOString().slice(0, 10);
    const d = new Date(t).getUTCDay();
    if (days.includes(d)) occurrences.push({ date, ...timeFor(d)! });
    if (occurrences.length > MAX_OCCURRENCES)
      return { error: `A series can have at most ${MAX_OCCURRENCES} classes. Shorten the date range.` };
  }
  if (!occurrences.length)
    return { error: "No selected weekday falls within those dates." };
  return { occurrences };
}
