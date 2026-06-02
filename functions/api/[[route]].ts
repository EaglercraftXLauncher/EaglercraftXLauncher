// Cloudflare Pages Functions catch-all handler.
// Handles every request to /api/* — the [[route]] filename tells
// Pages to forward any /api/<anything> path here.

import type { Env } from "./_types";
import { preflight, fail } from "./_utils";
import { newOAuthState, googleLoginUrl, githubLoginUrl, googleCallback, githubCallback } from "./_auth";
import { browse, create, getOne, update, archive, hardDelete } from "./_content";
import { getPublicUser, getMe, updateMe, logout } from "./_users";
import type { ContentType } from "./_types";

// Pages Functions expose env via EventContext
export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request: req, env } = ctx;

  // Strip the /api prefix to get the logical path
  const url    = new URL(req.url);
  const path   = url.pathname.replace(/^\/api/, "") || "/";
  const method = req.method.toUpperCase();

  if (method === "OPTIONS") return preflight(env);

  try {
    // ── Auth ───────────────────────────────────────────────────
    if (path === "/auth/google" && method === "GET") {
      const state = await newOAuthState(env);
      return Response.redirect(googleLoginUrl(env, state, url.origin));
    }

    if (path === "/auth/github" && method === "GET") {
      const state = await newOAuthState(env);
      return Response.redirect(githubLoginUrl(env, state, url.origin));
    }

    if (path === "/auth/google/callback" && method === "GET")
      return googleCallback(req, env);

    if (path === "/auth/github/callback" && method === "GET")
      return githubCallback(req, env);

    if (path === "/auth/me" && method === "GET")    return getMe(req, env);
    if (path === "/auth/me" && method === "PATCH")  return updateMe(req, env);
    if (path === "/auth/logout" && method === "POST") return logout(req, env);

    // ── Users ──────────────────────────────────────────────────
    const userMatch = path.match(/^\/users\/([^/]+)$/);
    if (userMatch && method === "GET") return getPublicUser(req, env, userMatch[1]);

    // ── Content — collection routes (/clients /mods /skins) ───
    const TYPE_MAP: Record<string, ContentType> = {
      clients: "client", mods: "mod", skins: "skin",
    };

    const collMatch = path.match(/^\/(clients|mods|skins)$/);
    if (collMatch) {
      const type = TYPE_MAP[collMatch[1]];
      if (method === "GET")  return browse(req, env, type);
      if (method === "POST") return create(req, env, type);
    }

    // ── Content — single entry routes (/clients/:id etc.) ─────
    const entryMatch = path.match(/^\/(clients|mods|skins)\/([^/]+)$/);
    if (entryMatch) {
      const type = TYPE_MAP[entryMatch[1]];
      const id   = entryMatch[2];
      if (method === "GET")    return getOne(req, env, id);
      if (method === "PATCH")  return update(req, env, id);
      if (method === "DELETE") return hardDelete(req, env, id);
    }

    // ── Archive action ─────────────────────────────────────────
    const archMatch = path.match(/^\/(clients|mods|skins)\/([^/]+)\/archive$/);
    if (archMatch && method === "POST")
      return archive(req, env, archMatch[2]);

    // ── Health ─────────────────────────────────────────────────
    if (path === "/health" && method === "GET") {
      return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return fail("Not found", env, 404);

  } catch (e) {
    console.error("[api] unhandled:", e);
    return fail("Internal server error", env, 500);
  }
};
