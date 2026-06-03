import type { Env, User } from "./_types";
import {
  nanoid,
  createToken, saveSession,
  saveUser, userByEmail, userByProvider, linkProvider,
} from "./_utils";

// ── OAuth state ────────────────────────────────────────────────
export async function newOAuthState(env: Env): Promise<string> {
  const state = nanoid(32);
  await env.SESSIONS.put(`oauth_state:${state}`, "1", { expirationTtl: 600 });
  return state;
}

async function consumeState(env: Env, state: string | null): Promise<boolean> {
  if (!state) return false;
  const v = await env.SESSIONS.get(`oauth_state:${state}`);
  if (!v) return false;
  await env.SESSIONS.delete(`oauth_state:${state}`);
  return true;
}

// ── Google ─────────────────────────────────────────────────────
export function googleLoginUrl(env: Env, state: string, origin: string): string {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id",     env.GOOGLE_CLIENT_ID);
  u.searchParams.set("redirect_uri",  `${origin}/api/auth/google/callback`);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope",         "openid email profile");
  u.searchParams.set("state",         state);
  u.searchParams.set("access_type",   "online");
  return u.toString();
}

export async function googleCallback(req: Request, env: Env): Promise<Response> {
  const url   = new URL(req.url);
  const code  = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !(await consumeState(env, state)))
    return Response.redirect(`${siteUrl(env)}/auth/error?msg=invalid_state`);

  const tokRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri:  `${url.origin}/api/auth/google/callback`,
      grant_type:    "authorization_code",
    }),
  });
  if (!tokRes.ok) return Response.redirect(`${siteUrl(env)}/auth/error?msg=token_failed`);
  const { access_token } = await tokRes.json<{ access_token: string }>();

  const profRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!profRes.ok) return Response.redirect(`${siteUrl(env)}/auth/error?msg=profile_failed`);
  const prof = await profRes.json<{ sub: string; email: string; name: string }>();

  const user = await findOrCreate(env, { provider: "google", providerId: prof.sub, email: prof.email, name: prof.name });
  return issueSession(env, user);
}

// ── GitHub ─────────────────────────────────────────────────────
export function githubLoginUrl(env: Env, state: string, origin: string): string {
  const u = new URL("https://github.com/login/oauth/authorize");
  u.searchParams.set("client_id",    env.GITHUB_CLIENT_ID);
  u.searchParams.set("redirect_uri", `${origin}/api/auth/github/callback`);
  u.searchParams.set("scope",        "read:user user:email");
  u.searchParams.set("state",        state);
  return u.toString();
}

export async function githubCallback(req: Request, env: Env): Promise<Response> {
  const url   = new URL(req.url);
  const code  = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !(await consumeState(env, state)))
    return Response.redirect(`${siteUrl(env)}/auth/error?msg=invalid_state`);

  const tokRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id:     env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri:  `${url.origin}/api/auth/github/callback`,
    }),
  });
  if (!tokRes.ok) return Response.redirect(`${siteUrl(env)}/auth/error?msg=token_failed`);
  const { access_token } = await tokRes.json<{ access_token: string }>();

  const ghHeaders = { Authorization: `Bearer ${access_token}`, "User-Agent": "eaglercraft-hub" };

  const profRes = await fetch("https://api.github.com/user", { headers: ghHeaders });
  if (!profRes.ok) return Response.redirect(`${siteUrl(env)}/auth/error?msg=profile_failed`);
  const prof = await profRes.json<{ id: number; login: string; name: string | null; email: string | null }>();

  let email = prof.email ?? "";
  if (!email) {
    const eRes = await fetch("https://api.github.com/user/emails", { headers: ghHeaders });
    if (eRes.ok) {
      const emails = await eRes.json<Array<{ email: string; primary: boolean; verified: boolean }>>();
      email = emails.find(e => e.primary && e.verified)?.email ?? emails[0]?.email ?? "";
    }
  }
  if (!email) return Response.redirect(`${siteUrl(env)}/auth/error?msg=no_email`);

  const user = await findOrCreate(env, {
    provider: "github", providerId: String(prof.id),
    email, name: prof.name || prof.login,
  });
  return issueSession(env, user);
}

// ── Shared ─────────────────────────────────────────────────────
async function findOrCreate(
  env: Env,
  info: { provider: "google" | "github"; providerId: string; email: string; name: string },
): Promise<User> {
  // 1. By provider id
  let user = await userByProvider(env, info.provider, info.providerId);
  if (user) return user;

  // 2. By email (merge providers)
  user = await userByEmail(env, info.email);
  if (user) {
    if (!user.providers.includes(info.provider)) {
      user.providers.push(info.provider);
      user.providerIds[info.provider] = info.providerId;
      await saveUser(env, user);
    }
    await linkProvider(env, info.provider, info.providerId, user.uid);
    return user;
  }

  // 3. New user
  const now  = new Date().toISOString();
  const uid  = nanoid();
  const newUser: User = {
    uid, email: info.email, name: info.name, bio: "",
    gravatarEmail: info.email, role: "user",
    providers: [info.provider], providerIds: { [info.provider]: info.providerId },
    createdAt: now, updatedAt: now,
  };
  await saveUser(env, newUser);
  await linkProvider(env, info.provider, info.providerId, uid);
  return newUser;
}

// Strip trailing slashes from SITE_URL so we never get double-slash URLs
function siteUrl(env: Env): string {
  return env.SITE_URL.replace(/\/+$/, "");
}

async function issueSession(env: Env, user: User): Promise<Response> {
  const token = await createToken(user.uid, env.SESSION_SECRET);
  await saveSession(env, token, user.uid);
  const dest = new URL(`${siteUrl(env)}/auth/callback`);
  dest.searchParams.set("token", token);
  return Response.redirect(dest.toString(), 302);
}
