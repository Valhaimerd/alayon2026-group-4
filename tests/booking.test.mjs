import { test } from "node:test";
import assert from "node:assert/strict";
import { validateBooking } from "../lib/booking-validation.ts";
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
