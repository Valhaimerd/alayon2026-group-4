"use server";

import { randomInt, randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { accountSession } from "../../lib/account-session";
import { normalizePhone, smsCodeHash } from "../../lib/sms-security";
import { sendSms } from "../../lib/sms";
import type { ActionResult } from "./actions";

export type SmsResult = NonNullable<ActionResult> & { challengeId?: string; phone?: string };
const fail = (message: string): SmsResult => ({ ok: false, message });

export async function requestSmsCode(_: SmsResult | null, form: FormData): Promise<SmsResult> {
  const { db, user, error } = await accountSession();
  if (!user) return fail("Sign in first.");
  const secret = process.env.ACCOUNT_SMS_SERVER_SECRET;
  if (!secret || !process.env.HATURIKOSMS_API_KEY) return fail("SMS verification is not configured. Contact your account administrator.");
  const enrollment = form.get("purpose") === "enroll";
  if (enrollment && error) return fail(error);
  const phone = enrollment ? normalizePhone(String(form.get("phone") ?? "")) : null;
  if (enrollment && !phone) return fail("Enter a mobile number with a country code, such as +63 9XX XXX XXXX.");
  const id = randomUUID();
  const code = String(randomInt(0, 1000000)).padStart(6, "0");
  const started = await db.rpc("start_account_sms", {
    p_secret: secret, p_id: id, p_code_hash: smsCodeHash(secret, user.id, id, code), p_phone: phone,
  });
  if (started.error) return fail("Could not start SMS verification. Try again.");
  if (!started.data?.ok) {
    if (started.data?.reason === "cooldown") return fail("Wait 60 seconds before requesting another code.");
    if (started.data?.reason === "daily_limit") return fail("The daily SMS limit has been reached. Try again tomorrow or contact your account administrator.");
    return fail("Verify your account first or set up SMS in account settings.");
  }
  try {
    await sendSms({ to: started.data.phone, body: `Your CISC SchedFlow verification code is ${code}. It expires in 5 minutes. Do not share this code.`, eventId: id });
    const delivery = await db.rpc("account_sms_delivery", { p_secret: secret, p_id: id, p_delivered: true });
    if (delivery.error) return fail("The code was sent, but verification could not be prepared. Wait 60 seconds and request a new code.");
    return { ok: true, message: "Verification code sent. It expires in 5 minutes.", challengeId: id, phone: `•••• ${started.data.phone.slice(-4)}` };
  } catch {
    return fail("The SMS provider could not accept the message. Wait 60 seconds and try again.");
  }
}

export async function verifySmsCode(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { db, user } = await accountSession();
  if (!user) return fail("Sign in first.");
  const secret = process.env.ACCOUNT_SMS_SERVER_SECRET;
  if (!secret) return fail("SMS verification is not configured.");
  const id = String(form.get("challengeId") ?? "");
  const code = String(form.get("code") ?? "").trim();
  if (!/^[a-f0-9-]{36}$/i.test(id) || !/^\d{6}$/.test(code)) return fail("Enter the six-digit code from your message.");
  const result = await db.rpc("verify_account_sms", { p_secret: secret, p_id: id, p_code_hash: smsCodeHash(secret, user.id, id, code) });
  if (result.error) return fail("Could not verify your code. Try again.");
  if (!result.data?.ok) return fail(result.data?.reason === "incorrect" ? "That code is incorrect. Try again." : "This code expired or reached its attempt limit. Request a new code.");
  refresh();
  return { ok: true, message: "Mobile number verified. SMS verification is on for this account." };
}

export async function disableSms(): Promise<ActionResult> {
  const { db, user, error } = await accountSession();
  if (error || !user) return fail(error || "Sign in first.");
  const result = await db.rpc("disable_account_sms", { p_secret: process.env.ACCOUNT_SMS_SERVER_SECRET ?? "" });
  if (result.error || !result.data) return fail("Could not disable SMS verification. Verify your account and try again.");
  refresh();
  return { ok: true, message: "SMS verification is off." };
}
