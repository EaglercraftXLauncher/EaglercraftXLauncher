import type { Env } from "./_types";
import { ok, fail, getUser, saveUser, sessionUser, extractToken, gravatar } from "./_utils";

export async function getPublicUser(req: Request, env: Env, uid: string): Promise<Response> {
  const user = await getUser(env, uid);
  if (!user) return fail("User not found", env, 404);
  const { email: _e, providerIds: _p, ...pub } = user;
  return ok({ ...pub, avatar: await gravatar(user.gravatarEmail) }, env);
}

export async function getMe(req: Request, env: Env): Promise<Response> {
  const user = await sessionUser(req, env);
  if (!user) return fail("Unauthorized", env, 401);
  return ok({ ...user, avatar: await gravatar(user.gravatarEmail) }, env);
}

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

export async function logout(req: Request, env: Env): Promise<Response> {
  const token = extractToken(req);
  if (token) await env.SESSIONS.delete(`session:${token}`);
  return ok({ loggedOut: true }, env);
}
