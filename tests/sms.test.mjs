import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { sendScheduleChange } from "../lib/sms.ts";

test("queues the instructor notice and reports provider failures", async () => {
  process.env.HATURIKOSMS_API_KEY = "test-key";
  const fetchMock = mock.method(globalThis, "fetch", async (_url, options) => {
    assert.equal(options.headers["Idempotency-Key"], "event-1");
    assert.match(JSON.parse(options.body).body, /Room 101/);
    return new Response(JSON.stringify({ message: { id: "msg_1" } }), {
      status: 202,
    });
  });
  const event = {
    to: "09123456789",
    course: "CS 101",
    room: "Room 101",
    time: "Monday 9:00",
    scheduleUrl: "https://example.com/schedule",
    eventId: "event-1",
  };
  assert.deepEqual(await sendScheduleChange(event), { messageId: "msg_1" });
  fetchMock.mock.mockImplementation(
    async () => new Response("{}", { status: 403 }),
  );
  await assert.rejects(sendScheduleChange(event), /403/);
  fetchMock.mock.restore();
});
