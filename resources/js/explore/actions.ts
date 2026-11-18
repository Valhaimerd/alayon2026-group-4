import { postAction, type ActionResult } from "../lib/actions";
export type { ActionResult };
export const login = (_: ActionResult, form: FormData) => postAction("/actions/login", form);
export async function logout() { await postAction("/actions/logout"); }
export const saveBooking = (_: ActionResult, form: FormData) => postAction("/actions/bookings/save", form);
export const setPublished = (_: ActionResult, form: FormData) => postAction("/actions/bookings/publish", form);
export const retryNotice = (_: ActionResult, form: FormData) => postAction("/actions/notices/retry", form);
