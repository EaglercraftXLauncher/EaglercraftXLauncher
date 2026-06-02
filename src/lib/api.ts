// All API calls go to /api/* which is served by the Pages Function.
// In dev, Vite proxies /api → wrangler pages dev (:8788).
// In production, Pages routes /api/* to the Function automatically.

import type { User, ContentEntry, BrowseResult, ContentType, ContentCategory } from "../types";

const BASE = "/api";

function token(): string | null {
  return sessionStorage.getItem("session_token");
}

function authHeaders(): HeadersInit {
  const t = token();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res  = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...(init?.headers ?? {}) },
  });
  const json = await res.json() as { ok: boolean; data?: T; error?: string };
  if (!json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json.data as T;
}

export const api = {
  auth: {
    // Redirect browser to OAuth provider
    loginGoogle: () => { window.location.href = `${BASE}/auth/google`; },
    loginGithub: () => { window.location.href = `${BASE}/auth/github`; },

    me:       () => apiFetch<User & { email: string }>("/auth/me"),
    updateMe: (body: Partial<Pick<User, "name" | "bio" | "gravatarEmail">>) =>
      apiFetch<User>("/auth/me", { method: "PATCH", body: JSON.stringify(body) }),
    logout: () => apiFetch<{ loggedOut: boolean }>("/auth/logout", { method: "POST" }),
  },

  users: {
    get: (uid: string) => apiFetch<User>(`/users/${uid}`),
  },

  browse: (
    type: ContentType,
    params: { category?: ContentCategory; limit?: number; offset?: number; q?: string } = {},
  ) => {
    const sp = new URLSearchParams();
    if (params.category) sp.set("category", params.category);
    if (params.limit)    sp.set("limit",    String(params.limit));
    if (params.offset)   sp.set("offset",   String(params.offset));
    if (params.q)        sp.set("q",        params.q);
    const qs = sp.toString();
    return apiFetch<BrowseResult>(`/${type}s${qs ? `?${qs}` : ""}`);
  },

  getEntry: (type: ContentType, id: string) =>
    apiFetch<ContentEntry>(`/${type}s/${id}`),

  createEntry: (type: ContentType, body: Partial<ContentEntry>) =>
    apiFetch<ContentEntry>(`/${type}s`, { method: "POST", body: JSON.stringify(body) }),

  updateEntry: (type: ContentType, id: string, body: Partial<ContentEntry>) =>
    apiFetch<ContentEntry>(`/${type}s/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  archiveEntry: (type: ContentType, id: string) =>
    apiFetch<ContentEntry>(`/${type}s/${id}/archive`, { method: "POST" }),

  deleteEntry: (type: ContentType, id: string) =>
    apiFetch<{ deleted: boolean }>(`/${type}s/${id}`, { method: "DELETE" }),
};
