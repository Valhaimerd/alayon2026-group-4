import { postAction, type ActionResult } from "../lib/actions";
export type SmsResult = NonNullable<ActionResult> & { challengeId?: string; phone?: string };
export const requestSmsCode = (_: SmsResult | null, form: FormData) => postAction<SmsResult>("/actions/account/sms/request", form, false);
export const verifySmsCode = (_: ActionResult, form: FormData) => postAction("/actions/account/sms/verify", form);
export const disableSms = () => postAction("/actions/account/sms/disable");
