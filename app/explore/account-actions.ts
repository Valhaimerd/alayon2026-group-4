"use server";

import { createClient } from "@supabase/supabase-js";
import { refresh } from "next/cache";
import { accountSession } from "../../lib/account-session";
import { passwordError } from "../../lib/account-security";
import type { ActionResult } from "./actions";

export type SecurityResult = ActionResult & {
  enrollment?: { id: string; secret: string; qrCode: string };
};
const fail = (message: string) => ({ ok: false, message });

export async function updateProfile(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { db, error } = await accountSession();
  if (error) return fail(error);
  const name = String(form.get("name") ?? "").trim();
  if (!name || name.length > 100) return fail("Enter a display name of 1–100 characters.");
  const result = await db.auth.updateUser({ data: { display_name: name } });
  if (result.error) return fail("Could not save your display name. Try again.");
  refresh();
  return { ok: true, message: "Display name saved." };
}

export async function changePassword(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { db, user, error } = await accountSession();
  if (error || !user?.email) return fail(error || "Sign in with your email first.");
  const password = String(form.get("password") ?? "");
  const invalid = passwordError(password, String(form.get("confirmation") ?? ""));
  if (invalid) return fail(invalid);
  const currentPassword = String(form.get("currentPassword") ?? "");
  if (!currentPassword) return fail("Enter your current password.");
  // Verify in an isolated client so password authentication cannot downgrade the MFA session.
  const verifier = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const checked = await verifier.auth.signInWithPassword({ email: user.email, password: currentPassword });
  if (checked.error) return fail("Your current password could not be verified.");
  await verifier.auth.signOut({ scope: "local" });
  const result = await db.auth.updateUser({ password, current_password: currentPassword });
  if (result.error) return fail(result.error.code === "same_password" ? "Choose a different new password." : "Could not change your password. Check the password requirements or sign in again.");
  return { ok: true, message: "Password changed." };
}

export async function enrollAuthenticator(): Promise<SecurityResult> {
  const { db, user, error } = await accountSession();
  if (error || !user) return fail(error || "Sign in first.");
  if (user.factors?.some((factor) => factor.status === "verified")) return fail("An authenticator is already enabled.");
  for (const factor of user.factors ?? []) {
    if (factor.factor_type === "totp" && factor.status === "unverified") {
      const removed = await db.auth.mfa.unenroll({ factorId: factor.id });
      if (removed.error) return fail("Could not restart authenticator setup. Try again.");
    }
  }
  const result = await db.auth.mfa.enroll({ factorType: "totp", friendlyName: "CISC SchedFlow", issuer: "CISC SchedFlow" });
  if (result.error) return fail("Could not start authenticator setup. Try again.");
  return { ok: true, message: "Scan the QR code, then enter the six-digit code.", enrollment: {
    id: result.data.id,
    secret: result.data.totp.secret,
    qrCode: `data:image/svg+xml;base64,${Buffer.from(result.data.totp.qr_code.replace(/^data:image\/svg\+xml;utf-8,/, "")).toString("base64")}`,
  } };
}

export async function verifyAuthenticator(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { db, user } = await accountSession();
  if (!user) return fail("Sign in first.");
  const id = String(form.get("factorId") ?? "");
  const code = String(form.get("code") ?? "").trim();
  if (!user.factors?.some((factor) => factor.id === id && factor.factor_type === "totp")) return fail("Start authenticator setup or sign in again.");
  if (!/^\d{6}$/.test(code)) return fail("Enter the six-digit code from your authenticator app.");
  const result = await db.auth.mfa.challengeAndVerify({ factorId: id, code });
  if (result.error) return fail("The code could not be verified. Try the latest code.");
  refresh();
  return { ok: true, message: "Authenticator verified." };
}

export async function removeAuthenticator(_: ActionResult, form: FormData): Promise<ActionResult> {
  const { db, user, error } = await accountSession();
  if (error || !user) return fail(error || "Sign in first.");
  const id = String(form.get("factorId") ?? "");
  if (!user.factors?.some((factor) => factor.id === id && factor.factor_type === "totp")) return fail("Authenticator not found.");
  const result = await db.auth.mfa.unenroll({ factorId: id });
  if (result.error) return fail("Could not remove the authenticator. Verify your code or sign in again.");
  // Refresh the token after removing a factor before using the remaining session.
  const renewed = await db.auth.refreshSession();
  if (renewed.error) {
    await db.auth.signOut({ scope: "local" });
    refresh();
    return { ok: true, message: "Authenticator removed. Sign in again." };
  }
  refresh();
  return { ok: true, message: "Authenticator app removed." };
}
