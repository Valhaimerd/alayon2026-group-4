import { postAction, type ActionResult } from "../lib/actions";
export const createTerm = (_: ActionResult, form: FormData) => postAction("/actions/setup/term", form);
export const createSection = (_: ActionResult, form: FormData) => postAction("/actions/setup/section", form);
export const linkInstructor = (_: ActionResult, form: FormData) => postAction("/actions/setup/instructor", form);
