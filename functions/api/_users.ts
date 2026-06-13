import type { Env, User } from "./_types";
import { ok, fail, getUser, saveUser, sessionUser, extractToken, gravatar } from "./_utils";

// ── Public profile ─────────────────────────────────────────────
export async function getPublicUser(_req: Request, env: Env, uid: string): Promise<Response> {
  const user = await getUser(env, uid);
  if (!user) return fail("User not found", env, 404);
  const { email: _e, providerIds: _p, ...pub } = user;
  return ok({ ...pub, avatar: await gravatar(user.gravatarEmail) }, env);
}

// ── List all users (paginated) ─────────────────────────────────
export async function listUsers(_req: Request, env: Env): Promise<Response> {
  const sp     = new URL(_req.url).searchParams;
  const limit  = Math.min(Number(sp.get("limit") ?? 50), 100);
  const cursor = sp.get("cursor") ?? undefined;

  const list = await env.USERS.list({ prefix: "user:", limit, cursor });

  const users = await Promise.all(
    list.keys.map(async k => {
      const u = await env.USERS.get(k.name, { type: "json" }) as User | null;
      if (!u) return null;
      const { email: _e, providerIds: _p, ...pub } = u;
      return { ...pub, avatar: await gravatar(u.gravatarEmail) };
    })
  );

  return ok({
    users:    users.filter(Boolean),
    cursor:   list.list_complete ? null : list.cursor,
    total:    users.filter(Boolean).length,
  }, env);
}

// ── Get me ─────────────────────────────────────────────────────
export async function getMe(req: Request, env: Env): Promise<Response> {
  const user = await sessionUser(req, env);
  if (!user) return fail("Unauthorized", env, 401);
  return ok({ ...user, avatar: await gravatar(user.gravatarEmail) }, env);
}

// ── Update me ──────────────────────────────────────────────────
export async function updateMe(req: Request, env: Env): Promise<Response> {
  const user = await sessionUser(req, env);
  if (!user) return fail("Unauthorized", env, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return fail("Invalid JSON", env, 400); }

  if (typeof body.name === "string" && body.name.trim())
    user.name = body.name.trim().slice(0, 50);
  if (typeof body.bio === "string")
    user.bio = body.bio.slice(0, 300);
  if (typeof body.gravatarEmail === "string" && body.gravatarEmail.includes("@"))
    user.gravatarEmail = body.gravatarEmail.trim().toLowerCase();

  await saveUser(env, user);
  return ok({ ...user, avatar: await gravatar(user.gravatarEmail) }, env);
}

// ── Logout ─────────────────────────────────────────────────────
export async function logout(req: Request, env: Env): Promise<Response> {
  const token = extractToken(req);
  if (token) await env.SESSIONS.delete(`session:${token}`);
  return ok({ loggedOut: true }, env);
}

// ── Ban / Suspend user (admin/owner only) ──────────────────────
export async function banUser(req: Request, env: Env, targetUid: string): Promise<Response> {
  const actor = await sessionUser(req, env);
  if (!actor) return fail("Unauthorized", env, 401);
  if (actor.role !== "admin" && actor.role !== "owner")
    return fail("Forbidden", env, 403);

  const target = await getUser(env, targetUid);
  if (!target) return fail("User not found", env, 404);

  // Admins cannot ban other admins or the owner
  if (actor.role === "admin" && (target.role === "admin" || target.role === "owner"))
    return fail("Admins cannot ban other admins or the owner", env, 403);
  // Nobody can ban the owner
  if (target.role === "owner")
    return fail("The owner cannot be banned", env, 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return fail("Invalid JSON", env, 400); }

  // durationDays = 0 means permanent ban
  const durationDays = Number(body.durationDays ?? 0);
  const reason       = String(body.reason ?? "").trim().slice(0, 200) || "Banned by admin";

  const bannedUntil = durationDays > 0
    ? new Date(Date.now() + durationDays * 86400000).toISOString()
    : null; // null = permanent

  target.banned      = true;
  target.bannedUntil = bannedUntil;
  target.banReason   = reason;
  await saveUser(env, target);

  // Invalidate all sessions for this user by listing and deleting
  // (KV doesn't support querying by value, so we store a ban flag separately)
  await env.USERS.put(`banned:${targetUid}`, JSON.stringify({
    bannedUntil,
    reason,
    bannedAt: new Date().toISOString(),
    bannedBy: actor.uid,
  }));

  return ok({ banned: true, bannedUntil, reason }, env);
}

// ── Unban user (admin/owner only) ──────────────────────────────
export async function unbanUser(req: Request, env: Env, targetUid: string): Promise<Response> {
  const actor = await sessionUser(req, env);
  if (!actor) return fail("Unauthorized", env, 401);
  if (actor.role !== "admin" && actor.role !== "owner")
    return fail("Forbidden", env, 403);

  const target = await getUser(env, targetUid);
  if (!target) return fail("User not found", env, 404);

  target.banned      = false;
  target.bannedUntil = null;
  target.banReason   = undefined;
  await saveUser(env, target);
  await env.USERS.delete(`banned:${targetUid}`);

  return ok({ unbanned: true }, env);
}
