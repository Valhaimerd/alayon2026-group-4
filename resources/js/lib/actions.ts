import { reloadWorkspace } from "./navigation";

export type ActionResult = { ok: boolean; message: string; id?: string } | null;
type Result = NonNullable<ActionResult> & { csrfToken?: string; clearHistory?: boolean };

/** Same-origin, CSRF-protected Laravel actions. Supabase tokens stay on the server. */
export async function postAction<T extends Result = Result>(path: string, form = new FormData(), refresh = true): Promise<T> {
  let result: T;
  try {
    const response = await fetch(path, {
      method: "POST", credentials: "same-origin", body: form,
      headers: { Accept: "application/json", "X-CSRF-TOKEN": document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? "" },
    });
    if (!response.ok) {
      return { ok: false, message: response.status === 419 ? "Your session expired. Refresh the page and try again." : response.status === 429 ? "Too many attempts. Wait a moment and try again." : "Could not complete this request. Try again." } as T;
    }
    result = await response.json() as T;
  } catch {
    return { ok: false, message: "Could not connect. Check your connection and try again." } as T;
  }
  if (result.csrfToken) {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]');
    if (meta) meta.content = result.csrfToken;
  }
  if (result.ok && refresh) await reloadWorkspace();
  return result;
}
