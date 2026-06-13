import type { Env } from "./_types";
import type { ContentKind } from "./_github";
import { preflight, fail } from "./_utils";
import { newOAuthState, googleLoginUrl, githubLoginUrl, googleCallback, githubCallback } from "./_auth";
import { browse, create, getOne, getFileUrl, hardDelete } from "./_content";
import { getPublicUser, listUsers, getMe, updateMe, logout, banUser, unbanUser } from "./_users";
import {
  claimOwner, generateAdminPass, listAdminPasses, revokeAdminPass,
  claimAdmin, claimDeveloper, getDevQuestions,
} from "./_roles";

const KIND_MAP: Record<string, ContentKind> = {
  clients: "client", mods: "mod", skins: "skin",
};

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request: req, env } = ctx;
  const url    = new URL(req.url);
  const path   = url.pathname.replace(/^\/api/, "") || "/";
  const method = req.method.toUpperCase();

  if (method === "OPTIONS") return preflight(env);

  try {
    // ── Auth ────────────────────────────────────────────────────
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

    // ── Roles ───────────────────────────────────────────────────
    if (path === "/roles/claim-owner"     && method === "POST") return claimOwner(req, env);
    if (path === "/roles/claim-admin"     && method === "POST") return claimAdmin(req, env);
    if (path === "/roles/claim-developer" && method === "POST") return claimDeveloper(req, env);
    if (path === "/roles/dev-questions"   && method === "GET")  return getDevQuestions(req, env);
    if (path === "/roles/admin-passes"    && method === "POST") return generateAdminPass(req, env);
    if (path === "/roles/admin-passes"    && method === "GET")  return listAdminPasses(req, env);
    const passRevoke = path.match(/^\/roles\/admin-passes\/([a-z0-9]+)$/);
    if (passRevoke && method === "DELETE") return revokeAdminPass(req, env, passRevoke[1]);

    // ── Users ───────────────────────────────────────────────────
    if (path === "/users" && method === "GET") return listUsers(req, env);
    const userMatch = path.match(/^\/users\/([^/]+)$/);
    if (userMatch && method === "GET") return getPublicUser(req, env, userMatch[1]);
    const banMatch = path.match(/^\/users\/([^/]+)\/ban$/);
    if (banMatch && method === "POST")   return banUser(req, env, banMatch[1]);
    if (banMatch && method === "DELETE") return unbanUser(req, env, banMatch[1]);

    // ── Content collection: /clients /mods /skins ───────────────
    const collMatch = path.match(/^\/(clients|mods|skins)$/);
    if (collMatch) {
      const kind = KIND_MAP[collMatch[1]];
      if (method === "GET")  return browse(req, env, kind);
      if (method === "POST") return create(req, env, kind);
    }

    // ── Content single: /clients/:id /mods/:id /skins/:id ───────
    const entryMatch = path.match(/^\/(clients|mods|skins)\/([^/]+)$/);
    if (entryMatch) {
      const kind      = KIND_MAP[entryMatch[1]];
      const contentId = entryMatch[2];
      if (method === "GET")    return getOne(req, env, kind, contentId);
      if (method === "DELETE") return hardDelete(req, env, kind, contentId);
    }

    // ── File download proxy: /content/:id/file ──────────────────
    const fileMatch = path.match(/^\/content\/([^/]+)\/file$/);
    if (fileMatch && method === "GET") return getFileUrl(req, env, fileMatch[1]);

    // ── Health ──────────────────────────────────────────────────
    if (path === "/health" && method === "GET")
      return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
        headers: { "Content-Type": "application/json" },
      });

    return fail("Not found", env, 404);
  } catch (e) {
    console.error("[api] unhandled:", e);
    return fail("Internal server error", env, 500);
  }
};
