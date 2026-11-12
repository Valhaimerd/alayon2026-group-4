import "server-only";
import { serverClient } from "./supabase";

export async function accountSession() {
  const db = await serverClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) return { db, user: null, needsVerification: false, error: "Sign in first." };
  const [assurance, sms] = await Promise.all([db.rpc("account_mfa_verified"), db.rpc("account_sms_status")]);
  if (assurance.error || sms.error) return { db, user, needsVerification: true, error: "Could not verify account security. Sign in again." };
  const needsVerification = assurance.data !== true;
  return { db, user, sms: { enabled: sms.data?.enabled === true, phone: typeof sms.data?.phone === "string" ? sms.data.phone : null, pending: sms.data?.pending ?? null }, needsVerification, error: needsVerification ? "Verify your sign-in code first." : null };
}
