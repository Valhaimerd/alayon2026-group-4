import { postAction, type ActionResult } from "../lib/actions";
export type SecurityResult = NonNullable<ActionResult> & { enrollment?: { id: string; secret: string; qrCode: string } };
export const updateProfile = (_: ActionResult, form: FormData) => postAction("/actions/account/profile", form);
export const changePassword = (_: ActionResult, form: FormData) => postAction("/actions/account/password", form, false);
export const enrollAuthenticator = () => postAction<SecurityResult>("/actions/account/totp/enroll", undefined, false);
export const verifyAuthenticator = (_: ActionResult, form: FormData) => postAction("/actions/account/totp/verify", form);
export const removeAuthenticator = (_: ActionResult, form: FormData) => postAction("/actions/account/totp/remove", form);
