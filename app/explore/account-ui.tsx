"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./staff-ui";
import { changePassword, enrollAuthenticator, removeAuthenticator, updateProfile, verifyAuthenticator, type SecurityResult } from "./account-actions";
import type { ActionResult } from "./actions";
import { logout } from "./actions";
import { disableSms, requestSmsCode, verifySmsCode, type SmsResult } from "./sms-actions";

export type AccountProfile = {
  email: string;
  name: string;
  role: string;
  factors: { id: string; name: string }[];
  needsVerification: boolean;
  sms: { enabled: boolean; phone: string | null; pending: { id: string; purpose: string; phone: string } | null };
};

function Status({ state }: { state: ActionResult }) {
  return state ? <p role={state.ok ? "status" : "alert"} className={state.ok ? "notice" : "notice error"}>{state.message}</p> : null;
}

function AccountButton({ profile, onClick, expanded }: { profile: AccountProfile; onClick: () => void; expanded: boolean }) {
  const initials = (profile.name.trim() || profile.email).split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <button className="account-avatar" onClick={onClick} aria-label={profile.needsVerification ? "Verify your account" : "Open account settings"} aria-haspopup="dialog" aria-expanded={expanded} title={profile.name || "Your account"}>
    {initials || <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="4" /><path d="M4 22v-3a8 8 0 0 1 16 0v3" /></svg>}
  </button>;
}

function SmsVerification({ enrollment = false, pending, onVerified }: { enrollment?: boolean; pending?: AccountProfile["sms"]["pending"]; onVerified: () => void }) {
  const [challenge, setChallenge] = useState<SmsResult | null>(pending ? { ok: true, message: "Enter your SMS code.", challengeId: pending.id, phone: pending.phone } : null);
  const [phone, setPhone] = useState("");
  const codeInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (challenge?.challengeId) codeInput.current?.focus(); }, [challenge?.challengeId]);
  const [sent, sendAction, sending] = useActionState(async (previous: SmsResult | null, form: FormData) => {
    const result = await requestSmsCode(previous, form);
    if (result.ok) setChallenge(result);
    return result;
  }, null);
  const [verified, verifyAction, verifying] = useActionState(async (previous: ActionResult, form: FormData) => {
    const result = await verifySmsCode(previous, form);
    if (result?.ok) { setChallenge(null); onVerified(); }
    return result;
  }, null);
  return <div className="stack">
    <form action={sendAction} className="stack">
      <input type="hidden" name="purpose" value={enrollment ? "enroll" : "login"} />
      {enrollment && <label>Mobile number<input name="phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+63 9XX XXX XXXX" required aria-describedby="sms-phone-help" /><span id="sms-phone-help" className="muted small">We’ll send a code to confirm this number before enabling SMS verification.</span></label>}
      <button disabled={sending || verifying}>{sending ? "Sending code…" : challenge ? "Resend code" : enrollment ? "Send verification code" : "Send login code"}</button>
    </form>
    <Status state={sent} />
    {challenge?.challengeId && <form action={verifyAction} className="stack">
      <p className="muted small">Enter the code sent to {challenge.phone}. You can request another code after 60 seconds.</p>
      <input type="hidden" name="challengeId" value={challenge.challengeId} />
      <label>SMS code<input ref={codeInput} name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required /></label>
      <button className="primary" disabled={verifying || sending}>{verifying ? "Verifying…" : "Verify SMS code"}</button>
    </form>}
    <Status state={verified} />
  </div>;
}

function SmsSettings({ profile }: { profile: AccountProfile }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(disableSms, null);
  return <div className="sms-enrollment">
    <h4>Text message (SMS)</h4>
    {profile.sms.enabled ? <>
      <p>Login codes are enabled for {profile.sms.phone}.</p>
      <form action={action}><button disabled={pending}>{pending ? "Disabling…" : "Turn off SMS verification"}</button></form>
    </> : <>
      <p className="muted small">Receive a six-digit code on your mobile when you sign in.</p>
      <SmsVerification enrollment pending={profile.sms.pending?.purpose === "enroll" ? profile.sms.pending : null} onVerified={() => router.refresh()} />
    </>}
    <Status state={state} />
  </div>;
}

function CodeForm({ factorId, onVerified }: { factorId: string; onVerified: () => void }) {
  const [state, action, pending] = useActionState(async (previous: ActionResult, form: FormData) => {
    const result = await verifyAuthenticator(previous, form);
    if (result?.ok) onVerified();
    return result;
  }, null);
  return <form action={action} className="stack">
    <input type="hidden" name="factorId" value={factorId} />
    <label>Authenticator code<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required /></label>
    <Status state={state} />
    <button className="primary" disabled={pending}>{pending ? "Verifying…" : "Verify code"}</button>
  </form>;
}

export function VerifySignIn({ profile }: { profile: AccountProfile }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [factorId, setFactorId] = useState(profile.factors[0]?.id ?? "");
  const [useSms, setUseSms] = useState(profile.sms.enabled);
  return <>
    <AccountButton profile={profile} onClick={() => setOpen(true)} expanded={open} />
    <Modal open={open} onClose={() => setOpen(false)} title="Verify your sign in">
      <p>{useSms ? `Send a verification code to your mobile ${profile.sms.phone} to continue.` : "Enter the code from your authenticator app to continue."}</p>
      {useSms ? <SmsVerification pending={profile.sms.pending?.purpose === "login" ? profile.sms.pending : null} onVerified={() => { setOpen(false); router.refresh(); }} /> : <>
        {profile.factors.length > 1 && <label>Authenticator<select value={factorId} onChange={(event) => setFactorId(event.target.value)}>{profile.factors.map((factor) => <option key={factor.id} value={factor.id}>{factor.name}</option>)}</select></label>}
        {factorId ? <CodeForm key={factorId} factorId={factorId} onVerified={() => { setOpen(false); router.refresh(); }} /> : <p role="alert">Could not load account verification. Sign in again or contact your account administrator.</p>}
      </>}
      {profile.sms.enabled && profile.factors.length > 0 && <button onClick={() => setUseSms(!useSms)}>{useSms ? "Use authenticator app instead" : "Use SMS instead"}</button>}
      <form action={logout} className="account-signout"><button>Sign out</button></form>
    </Modal>
  </>;
}

export function AccountSettings({ profile }: { profile: AccountProfile }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [profileState, profileAction, savingProfile] = useActionState(updateProfile, null);
  const [passwordState, passwordAction, savingPassword] = useActionState(changePassword, null);
  const [removeState, removeAction, removing] = useActionState(removeAuthenticator, null);
  const [setup, setSetup] = useState<SecurityResult | null>(null);
  const [starting, startSetup] = useTransition();
  const enrollment = setup?.enrollment;
  return <>
    <AccountButton profile={profile} onClick={() => setOpen(true)} expanded={open} />
    <Modal open={open} onClose={() => { setOpen(false); setSetup(null); }} title="Account settings">
      <div className="account-sections">
        <section aria-labelledby="account-profile-title">
          <h3 id="account-profile-title">Your account</h3>
          <p className="account-email">{profile.email}</p>
          <p className="muted small">Manage your personal details and sign-in security. Contact your account administrator to change your email.</p>
          <form action={profileAction} className="stack">
            <label>Display name<input name="name" defaultValue={profile.name} autoComplete="name" maxLength={100} required /></label>
            <Status state={profileState} />
            <button disabled={savingProfile}>{savingProfile ? "Saving…" : "Save display name"}</button>
          </form>
        </section>
        <section aria-labelledby="account-password-title">
          <h3 id="account-password-title">Change password</h3>
          <form action={passwordAction} className="stack">
            <label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required /></label>
            <label>New password<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required aria-describedby="password-help" /></label>
            <p id="password-help" className="muted small">Use at least 8 characters.</p>
            <label>Confirm new password<input name="confirmation" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label>
            <Status state={passwordState} />
            <button disabled={savingPassword}>{savingPassword ? "Changing…" : "Change password"}</button>
          </form>
        </section>
        <section aria-labelledby="account-mfa-title">
          <h3 id="account-mfa-title">Two-factor authentication</h3>
          <p className="muted small">Optional. Add an extra verification step with a text message or an authenticator app. Keep access to your chosen method.</p>
          <SmsSettings profile={profile} />
          <h4>Authenticator app</h4>
          {profile.factors.length ? <>
            <p>Your authenticator app is enabled.</p>
            {profile.factors.map((factor) => <form key={factor.id} action={removeAction} className="stack">
              <input type="hidden" name="factorId" value={factor.id} />
              <button disabled={removing}>{removing ? "Removing…" : `Remove ${factor.name}`}</button>
            </form>)}
          </> : enrollment ? <div className="stack">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="authenticator-qr" src={enrollment.qrCode} width={200} height={200} alt="Scan this QR code in your authenticator app" />
            <details><summary>Enter a setup key instead</summary><code className="authenticator-secret">{enrollment.secret}</code></details>
            <CodeForm factorId={enrollment.id} onVerified={() => { setSetup(null); router.refresh(); }} />
          </div> : <>
            <p>No authenticator app is connected.</p>
            <button disabled={starting} onClick={() => startSetup(async () => setSetup(await enrollAuthenticator()))}>{starting ? "Starting setup…" : "Set up authenticator"}</button>
          </>}
          <Status state={setup?.ok ? null : setup} />
          <Status state={removeState} />
        </section>
      </div>
      <form action={logout} className="account-signout"><button>Sign out</button></form>
    </Modal>
  </>;
}
