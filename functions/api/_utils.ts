import type { Env, Session, User } from "./_types";

const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
export function nanoid(size = 21): string {
  const b = crypto.getRandomValues(new Uint8Array(size));
  return Array.from(b, v => ABC[v % ABC.length]).join("");
}

export function cors(env: Env): Record<string, string> {
  return {
    "Access-Control-Allow-Origin":      env.SITE_URL.replace(/\/+$/, ""),
    "Access-Control-Allow-Methods":     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":     "Content-Type,Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}
export function preflight(env: Env): Response {
  return new Response(null, { status: 204, headers: cors(env) });
}
export function ok<T>(data: T, env: Env, status = 200): Response {
  return new Response(JSON.stringify({ ok: true, data }), {
    status,
    headers: { "Content-Type": "application/json", ...cors(env) },
  });
}
export function fail(msg: string, env: Env, status = 400): Response {
  return new Response(JSON.stringify({ ok: false, error: msg, status }), {
    status,
    headers: { "Content-Type": "application/json", ...cors(env) },
  });
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}
export async function createToken(uid: string, secret: string): Promise<string> {
  const payload = btoa(JSON.stringify({ uid, n: nanoid(12) }));
  const sig     = await hmac(secret, payload);
  return `${payload}.${sig}`;
}
export async function verifyToken(token: string, secret: string): Promise<string | null> {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig     = token.slice(dot + 1);
  const expected = await hmac(secret, payload);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  try { return (JSON.parse(atob(payload)) as { uid: string }).uid; }
  catch { return null; }
}

const SESSION_TTL = 30 * 24 * 60 * 60;
export async function saveSession(env: Env, token: string, uid: string): Promise<void> {
  const s: Session = { token, uid, expiresAt: Date.now() + SESSION_TTL * 1000 };
  await env.SESSIONS.put(`session:${token}`, JSON.stringify(s), { expirationTtl: SESSION_TTL });
}
export function extractToken(req: Request): string | null {
  const auth = req.headers.get("Authorization") ?? "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  const m = (req.headers.get("Cookie") ?? "").match(/(?:^|;\s*)session=([^;]+)/);
  return m ? m[1] : null;
}

export async function sessionUser(req: Request, env: Env): Promise<User | null> {
  const token = extractToken(req);
  if (!token) return null;
  const uid = await verifyToken(token, env.SESSION_SECRET);
  if (!uid) return null;
  const raw = await env.SESSIONS.get(`session:${token}`);
  if (!raw) return null;
  const s: Session = JSON.parse(raw);
  if (Date.now() > s.expiresAt) return null;
  const user = await getUser(env, uid);
  if (!user) return null;

  // Check ban status
  if (user.banned) {
    // If it's a timed suspend, check if it has expired
    if (user.bannedUntil && new Date(user.bannedUntil).getTime() < Date.now()) {
      // Suspension expired — auto-lift
      user.banned      = false;
      user.bannedUntil = null;
      user.banReason   = undefined;
      await saveUser(env, user);
      await env.USERS.delete(`banned:${uid}`);
      return user;
    }
    return null; // still banned — treat as unauthenticated
  }

  return user;
}

export async function getUser(env: Env, uid: string): Promise<User | null> {
  const raw = await env.USERS.get(`user:${uid}`);
  return raw ? (JSON.parse(raw) as User) : null;
}
export async function saveUser(env: Env, user: User): Promise<void> {
  const updated = { ...user, updatedAt: new Date().toISOString() };
  await env.USERS.put(`user:${user.uid}`, JSON.stringify(updated));
  await env.USERS.put(`email:${user.email}`, user.uid);
}
export async function userByEmail(env: Env, email: string): Promise<User | null> {
  const uid = await env.USERS.get(`email:${email}`);
  return uid ? getUser(env, uid) : null;
}
export async function userByProvider(env: Env, provider: string, id: string): Promise<User | null> {
  const uid = await env.USERS.get(`provider:${provider}:${id}`);
  return uid ? getUser(env, uid) : null;
}
export async function linkProvider(env: Env, provider: string, id: string, uid: string): Promise<void> {
  await env.USERS.put(`provider:${provider}:${id}`, uid);
}
export async function gravatar(email: string, size = 200): Promise<string> {
  const buf  = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email.trim().toLowerCase()));
  const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
}
