import "server-only";

type ScheduleChange = {
  to: string;
  course: string;
  room: string;
  time: string;
  scheduleUrl: string;
  eventId: string;
};

// Call only after a changed schedule is published and recipient consent is confirmed.
export async function sendScheduleChange(
  change: ScheduleChange,
): Promise<{ messageId: string }> {
  return sendSms({ to: change.to, body: `${change.course}: schedule updated to ${change.room}, ${change.time}. ${change.scheduleUrl}`, eventId: change.eventId });
}

export async function sendSms(change: { to: string; body: string; eventId: string }): Promise<{ messageId: string }> {
  const key = process.env.HATURIKOSMS_API_KEY;
  if (!key) throw new Error("HATURIKOSMS_API_KEY is not configured");

  const response = await fetch("https://sms.haturiko.tech/api/v1/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Idempotency-Key": change.eventId,
    },
    body: JSON.stringify({
      to: change.to,
      body: change.body,
      client_reference: change.eventId,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) throw new Error(`SMS provider returned ${response.status}`);
  const data: unknown = await response.json();
  if (
    !data ||
    typeof data !== "object" ||
    !("message" in data) ||
    !data.message ||
    typeof data.message !== "object" ||
    !("id" in data.message) ||
    typeof data.message.id !== "string"
  )
    throw new Error("SMS provider returned an invalid response");
  return { messageId: data.message.id };
}
