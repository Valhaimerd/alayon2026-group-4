import { test } from "node:test";
import assert from "node:assert/strict";
import { validateBooking, expandSchedule, initialScheduleDays } from "../lib/booking-validation.ts";

test("schedule payloads reject malformed shapes without throwing", () => {
  const valid = {
    mode: "weekly", from: "2026-11-09", until: "2026-11-15",
    days: [1], times: { 1: { start: "09:00", end: "10:00" } },
  };
  for (const input of [
    null, [], {}, "weekly", { ...valid, days: null },
    { ...valid, days: [8] }, { ...valid, times: null },
    { ...valid, mode: "other" },
  ]) {
    assert.doesNotThrow(() => expandSchedule(input));
    assert.ok("error" in expandSchedule(input));
  }
});
test("schedule dates reject rollover dates and preserve Sundays", () => {
  assert.deepEqual(initialScheduleDays("2026-11-15"), [0]);
  assert.deepEqual(initialScheduleDays("2026-11-16"), [1]);
  assert.deepEqual(initialScheduleDays(""), []);
  assert.match(
    expandSchedule({ mode: "once", date: "2026-02-30", times: { 1: { start: "09:00", end: "10:00" } } }).error,
    /valid date/i,
  );
});
test("rejects reversed times and over-capacity bookings", () => {
  assert.match(
    validateBooking(
      {
        start: "2026-11-12T10:00:00+08:00",
        end: "2026-11-12T09:00:00+08:00",
        size: 20,
      },
      40,
    ) || "",
    /end/i,
  );
  assert.match(
    validateBooking(
      {
        start: "2026-11-12T09:00:00+08:00",
        end: "2026-11-12T10:00:00+08:00",
        size: 41,
      },
      40,
    ) || "",
    /capacity/i,
  );
  assert.equal(
    validateBooking(
      {
        start: "2026-11-12T09:00:00+08:00",
        end: "2026-11-12T10:00:00+08:00",
        size: 40,
      },
      40,
    ),
    null,
  );
  assert.match(
    validateBooking(
      {
        start: "2026-11-12T23:00:00+08:00",
        end: "2026-11-13T01:00:00+08:00",
        size: 20,
      },
      40,
    ) || "",
    /same date/i,
  );
});

test("expands weekly schedules with shared or per-day times", async () => {
  const { expandSchedule } = await import("../lib/booking-validation.ts");
  const same = { start: "09:00", end: "10:30" };
  const weekly = expandSchedule({
    mode: "weekly",
    date: "",
    from: "2026-11-09", // Monday
    until: "2026-11-22",
    days: [1, 5],
    times: { 1: same, 5: { start: "13:00", end: "16:00" } },
  });
  assert.deepEqual(
    weekly.occurrences.map((o) => `${o.date} ${o.start}-${o.end}`),
    [
      "2026-11-09 09:00-10:30",
      "2026-11-13 13:00-16:00",
      "2026-11-16 09:00-10:30",
      "2026-11-20 13:00-16:00",
    ],
  );
  assert.equal(
    expandSchedule({ mode: "once", date: "2026-11-12", from: "", until: "", days: [], times: { 4: same } }).occurrences.length,
    1,
  );
  assert.match(
    expandSchedule({ mode: "weekly", date: "", from: "2026-11-09", until: "2026-11-10", days: [5], times: { 5: same } }).error,
    /No selected weekday/,
  );
  assert.match(
    expandSchedule({ mode: "once", date: "2026-11-12", from: "", until: "", days: [], times: { 4: { start: "10:00", end: "09:00" } } }).error,
    /later end/,
  );
  assert.match(
    expandSchedule({ mode: "weekly", date: "", from: "2026-01-01", until: "2027-12-31", days: [1, 2, 3, 4, 5], times: Object.fromEntries([1, 2, 3, 4, 5].map((d) => [d, same])) }).error,
    /at most/,
  );
});
