// The API listens one port up from the app (9000 -> 9100), so deriving its host from the page's
// own hostname makes one build work from localhost, a LAN IP or a Tailscale address.
// NEXT_PUBLIC_API_URL wins when set, e.g. behind a same-origin reverse proxy.
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? `http://${window.location.hostname}:9100` : "http://localhost:9100");

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Sends the session cookie on every call (the API is cross-origin: different port) and bounces
// to /login on a 401. Pass bounce=false where a 401 is an expected answer. Errors surface the
// API's `detail` message, so pages can show it as-is.
async function apiFetch<T>(path: string, init: RequestInit = {}, bounce = true): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: init.body ? { "content-type": "application/json", ...init.headers } : init.headers,
  });
  if (res.status === 401 && bounce && typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") message = body.detail;
      else if (Array.isArray(body.detail)) message = body.detail[0]?.msg ?? message;
    } catch {}
    throw new ApiError(res.status, message);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

const send = <T,>(method: string, path: string, body?: unknown) =>
  apiFetch<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

// --- Auth ---

export const apiLogin = (username: string, password: string) =>
  apiFetch<{ ok: true }>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }, false);

export const apiLogout = () => send<{ ok: true }>("POST", "/auth/logout");

// --- Notes (the example resource; one typed function per endpoint) ---

export type Note = {
  id: number;
  body: string;
  archived: boolean;
  created_at: string;
};

export const listNotes = (archived = false) => apiFetch<{ notes: Note[] }>(`/notes?archived=${archived}`);
export const createNote = (body: string) => send<{ note: Note }>("POST", "/notes", { body });
export const updateNote = (id: number, changes: Partial<Pick<Note, "body" | "archived">>) =>
  send<{ note: Note }>("PATCH", `/notes/${id}`, changes);
export const deleteNote = (id: number) => send<void>("DELETE", `/notes/${id}`);
