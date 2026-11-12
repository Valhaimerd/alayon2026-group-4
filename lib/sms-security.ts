import { createHmac } from "node:crypto";

export function normalizePhone(value: string) {
  const phone = value.trim().replace(/[\s()-]/g, "");
  const normalized = /^09\d{9}$/.test(phone) ? `+63${phone.slice(1)}` : /^63\d{10}$/.test(phone) ? `+${phone}` : phone;
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}

export function smsCodeHash(secret: string, userId: string, challengeId: string, code: string) {
  return createHmac("sha256", secret).update(`${userId}:${challengeId}:${code}`).digest("hex");
}
