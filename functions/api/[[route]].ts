import type { Env, ContentType } from "./_types";
import { preflight, fail } from "./_utils";
import { newOAuthState, googleLoginUrl, githubLoginUrl, googleCallback, githubCallback } from "./_auth";
import { browse, create, getOne, update, archive, hardDelete } from "./_content";
import { getPublicUser, getMe, updateMe, logout } from "./_users";

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request: req, env } = ctx;
  const url    = new URL(req.url);
  const path   = url.pathname.replace(/^\/api/, "") || "/";
  const method = req.method.toUpperCase();

  if (method === "OPTIONS") return preflight(env);

  try {
    if (path === "/auth/google" && method === "GET") {
      const state = await newOAuthState(env);
      return Response.redirect(googleLoginUrl(env, state, url.origin));
    }
    if (path === "/auth/github" && method === "GET") {
      const state = await newOAuthState(env);
      return Response.redirect(githubLoginUrl(env, state, url.origin));
    }
    if (path === "/auth/google/callback" && method === "GET") return googleCallback(req, env);
    if (path === "/auth/github/callback" && method === "GET") return githubCallback(req, env);
    if (path === "/auth/me"     && method === "GET")   return getMe(req, env);
    if (path === "/auth/me"     && method === "PATCH") return updateMe(req, env);
    if (path === "/auth/logout" && method === "POST")  return logout(req, env);

    const userMatch = path.match(/^\/users\/([^/]+)$/);
    if (userMatch && method === "GET") return getPublicUser(req, env, userMatch[1]);

    const TYPE_MAP: Record<string, ContentType> = {
      clients: "client", mods: "mod", skins: "skin",
    };

    const collMatch = path.match(/^\/(clients|mods|skins)$/);
    if (collMatch) {
      const t = TYPE_MAP[collMatch[1]];
      if (method === "GET")  return browse(req, env, t);
      if (method === "POST") return create(req, env, t);
    }

    const entryMatch = path.match(/^\/(clients|mods|skins)\/([^/]+)$/);
    if (entryMatch) {
      const id = entryMatch[2];
      if (method === "GET")    return getOne(req, env, id);
      if (method === "PATCH")  return update(req, env, id);
      if (method === "DELETE") return hardDelete(req, env, id);
    }

    const archMatch = path.match(/^\/(clients|mods|skins)\/([^/]+)\/archive$/);
    if (archMatch && method === "POST") return archive(req, env, archMatch[2]);

    if (path === "/health" && method === "GET")
      return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
        headers: { "Content-Type": "application/json" },
      });

    return fail("Not found", env, 404);
  } catch (e) {
    console.error("[api]", e);
    return fail("Internal server error", env, 500);
  }
};
