/**
 * _roles.ts — Role promotion endpoints
 *
 * POST /api/roles/claim-owner      { password }           → promotes to owner (one owner only)
 * POST /api/roles/claim-admin      { code }               → redeems single-use admin pass → admin
 * POST /api/roles/claim-developer  { a1, a2, a3 }         → checks dev questions → developer
 * POST /api/roles/generate-pass    { label? }             → owner only, creates admin pass code
 * GET  /api/roles/admin-passes                            → owner only, lists all passes
 * DELETE /api/roles/admin-passes/:code                   → owner only, revokes a pass
 * GET  /api/roles/dev-questions                           → returns the 3 question PROMPTS (not answers)
 */

import type { Env, User, AdminPass } from "./_types";
import { ok, fail, sessionUser, nanoid } from "./_utils";

// ── Dev question prompts (answers come from env vars) ──────────
// These are the visible question strings shown to the user.
// Answers are stored in env vars: DEV_QUESTION_1/2/3
const DEV_QUESTION_PROMPTS = [
  "What file extension do all Eaglercraft clients use? (lowercase, no dot)",
  "What is the username of the owner/creator of Eaglercraft and EagTek?",
  "What does EPK stand for in the Eaglercraft ecosystem?",
];

// ── Owner claim ───────────────────────────────────────────────
export async function claimOwner(req: Request, env: Env): Promise<Response> {
  const user = await sessionUser(req, env);
  if (!user) return fail("Unauthorized", env, 401);

  // Only one owner can exist — check if any owner exists already
  const existingOwner = await env.USERS.get("role_index:owner");
  if (existingOwner && existingOwner !== user.uid)
    return fail("An owner already exists", env, 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return fail("Invalid JSON", env, 400); }

  const password = String(body.password ?? "").trim();
  if (!password) return fail("password is required", env, 400);

  // Constant-time comparison to prevent timing attacks
  if (!secureCompare(password, env.OWNER_PASSWORD))
    return fail("Incorrect password", env, 403);

  user.role = "owner";
  await saveUserRole(env, user);
  await env.USERS.put("role_index:owner", user.uid);

  return ok({ role: "owner", message: "You are now the owner." }, env);
}

// ── Admin pass generation (owner only) ────────────────────────
export async function generateAdminPass(req: Request, env: Env): Promise<Response> {
  const user = await sessionUser(req, env);
  if (!user) return fail("Unauthorized", env, 401);
  if (user.role !== "owner") return fail("Only the owner can generate admin passes", env, 403);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* label is optional */ }

  const label = String(body.label ?? "").trim().slice(0, 60) || undefined;
  const code  = nanoid(24); // cryptographically random 24-char code

  const pass: AdminPass = {
    code,
    createdAt: new Date().toISOString(),
    used:      false,
    label,
  };

  await env.USERS.put(`adminpass:${code}`, JSON.stringify(pass));

  return ok({ code, label, createdAt: pass.createdAt }, env, 201);
}

// ── List admin passes (owner only) ────────────────────────────
export async function listAdminPasses(req: Request, env: Env): Promise<Response> {
  const user = await sessionUser(req, env);
  if (!user) return fail("Unauthorized", env, 401);
  if (user.role !== "owner") return fail("Forbidden", env, 403);

  const list = await env.USERS.list({ prefix: "adminpass:" });
  const passes = await Promise.all(
    list.keys.map(k => env.USERS.get(k.name, { type: "json" }) as Promise<AdminPass | null>)
  );

  return ok({ passes: passes.filter(Boolean) }, env);
}

// ── Revoke admin pass (owner only) ────────────────────────────
export async function revokeAdminPass(req: Request, env: Env, code: string): Promise<Response> {
  const user = await sessionUser(req, env);
  if (!user) return fail("Unauthorized", env, 401);
  if (user.role !== "owner") return fail("Forbidden", env, 403);

  const existing = await env.USERS.get(`adminpass:${code}`, { type: "json" }) as AdminPass | null;
  if (!existing) return fail("Pass not found", env, 404);

  await env.USERS.delete(`adminpass:${code}`);
  return ok({ revoked: code }, env);
}

// ── Claim admin (any logged-in user with valid unused pass) ────
export async function claimAdmin(req: Request, env: Env): Promise<Response> {
  const user = await sessionUser(req, env);
  if (!user) return fail("Unauthorized", env, 401);
  if (user.role === "admin" || user.role === "owner")
    return fail("Already an admin or owner", env, 400);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return fail("Invalid JSON", env, 400); }

  const code = String(body.code ?? "").trim();
  if (!code) return fail("code is required", env, 400);

  const pass = await env.USERS.get(`adminpass:${code}`, { type: "json" }) as AdminPass | null;
  if (!pass)       return fail("Invalid pass code", env, 403);
  if (pass.used)   return fail("This pass has already been used", env, 403);

  // Mark pass as used
  const usedPass: AdminPass = { ...pass, used: true, usedBy: user.uid, usedAt: new Date().toISOString() };
  await env.USERS.put(`adminpass:${code}`, JSON.stringify(usedPass));

  user.role = "admin";
  await saveUserRole(env, user);

  return ok({ role: "admin", message: "You are now an admin." }, env);
}

// ── Get dev question prompts ───────────────────────────────────
export async function getDevQuestions(_req: Request, env: Env): Promise<Response> {
  return ok({ questions: DEV_QUESTION_PROMPTS }, env);
}

// ── Claim developer ────────────────────────────────────────────
export async function claimDeveloper(req: Request, env: Env): Promise<Response> {
  const user = await sessionUser(req, env);
  if (!user) return fail("Unauthorized", env, 401);

  // Developers, admins, owners already have upload rights
  if (user.role !== "user")
    return fail("Your role already has developer access", env, 400);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return fail("Invalid JSON", env, 400); }

  const a1 = String(body.a1 ?? "").trim().toLowerCase();
  const a2 = String(body.a2 ?? "").trim().toLowerCase();
  const a3 = String(body.a3 ?? "").trim().toLowerCase();

  if (!a1 || !a2 || !a3) return fail("All three answers are required", env, 400);

  // Compare against env-var answers (case-insensitive)
  const correct1 = env.DEV_QUESTION_1?.trim().toLowerCase() ?? "";
  const correct2 = env.DEV_QUESTION_2?.trim().toLowerCase() ?? "";
  const correct3 = env.DEV_QUESTION_3?.trim().toLowerCase() ?? "";

  if (!correct1 || !correct2 || !correct3)
    return fail("Developer questions are not configured on this server", env, 503);

  const pass = a1 === correct1 && a2 === correct2 && a3 === correct3;
  if (!pass) return fail("One or more answers are incorrect", env, 403);

  user.role = "developer";
  await saveUserRole(env, user);

  return ok({ role: "developer", message: "Developer mode enabled." }, env);
}

// ── Helpers ────────────────────────────────────────────────────

/** Save updated role back to KV (re-reads full user to avoid partial overwrite). */
async function saveUserRole(env: Env, user: User): Promise<void> {
  const updated = { ...user, updatedAt: new Date().toISOString() };
  await env.USERS.put(`user:${user.uid}`, JSON.stringify(updated));
}

/** Constant-time string comparison — prevents timing attacks on secret comparison. */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export { saveUserRole }V̇
