/**
 * _content.ts — Content endpoints backed by GitHub CDN
 *
 * GET  /api/clients|mods|skins          — read index JSON from GitHub
 * POST /api/clients|mods|skins          — upload file + write index entry
 * GET  /api/clients|mods|skins/:id      — single entry from index
 * GET  /api/clients|mods|skins/:id/file — redirect to raw asset download
 * DELETE /api/clients|mods|skins/:id   — remove entry + delete release (admin/owner)
 */

import type { Env } from "./_types";
import { ok, fail, sessionUser, nanoid } from "./_utils";
import {
  readIndex, publishContent, deleteContent, getIndexAsset,
  type ContentKind, type ContentEntry,
} from "./_github";

// MIME types for serving content INLINE (viewable in browser, not downloaded)
const SERVE_MIME: Record<string, string> = {
  html: "text/html; charset=utf-8",
  js:   "application/javascript; charset=utf-8",
  png:  "image/png",
  jpg:  "image/jpeg",
  jpeg: "image/jpeg",
  gif:  "image/gif",
  webp: "image/webp",
  md:   "text/markdown; charset=utf-8",
  json: "application/json; charset=utf-8",
};

const CAN_UPLOAD = new Set(["developer", "admin", "owner"]);

// Derive file extension + mime type from uploaded file name
function resolveFileType(filename: string): { ext: string; mime: string } | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".html")) return { ext: "html", mime: "text/html" };
  if (lower.endsWith(".js"))   return { ext: "js",   mime: "application/javascript" };
  if (lower.endsWith(".png"))  return { ext: "png",  mime: "image/png" };
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return { ext: "png", mime: "image/jpeg" };
  if (lower.endsWith(".gif")) return { ext: "gif",  mime: "image/gif" };
  if (lower.endsWith(".webp"))return { ext: "webp", mime: "image/webp" };
  return null;
}

// ── Browse ─────────────────────────────────────────────────────
export async function browse(req: Request, env: Env, kind: ContentKind): Promise<Response> {
  const sp     = new URL(req.url).searchParams;
  const q      = sp.get("q")?.toLowerCase() ?? "";
  const limit  = Math.min(Number(sp.get("limit") ?? 24), 100);
  const offset = Number(sp.get("offset") ?? 0);

  const all = await readIndex(env, kind);
  const filtered = q
    ? all.filter(e => `${e.name} ${e.description} ${e.author}`.toLowerCase().includes(q))
    : all;

  return ok({
    items:  filtered.slice(offset, offset + limit),
    total:  filtered.length,
    limit,
    offset,
  }, env);
}

// ── Get one ────────────────────────────────────────────────────
export async function getOne(_req: Request, env: Env, kind: ContentKind, contentId: string): Promise<Response> {
  const all   = await readIndex(env, kind);
  const entry = all.find(e => e.contentId === contentId);
  if (!entry) return fail("Not found", env, 404);
  return ok(entry, env);
}

// ── Serve file inline (view, not download) ──────────────────────
export async function getFileUrl(_req: Request, env: Env, contentId: string): Promise<Response> {
  // Verify this contentId exists in one of the three indexes
  let exists = false;
  for (const kind of ["client", "mod", "skin"] as ContentKind[]) {
    const all = await readIndex(env, kind);
    if (all.some(e => e.contentId === contentId)) { exists = true; break; }
  }
  if (!exists) return fail("Content not found", env, 404);

  // Single API call — find the "index.<ext>" asset and its extension
  const asset = await getIndexAsset(env, contentId);
  if (!asset) return fail("File asset not found in release", env, 404);

  // Proxy the binary from GitHub (PAT never reaches the browser)
  const assetRes = await fetch(asset.url, {
    headers: {
      Authorization:          `Bearer ${env.GITHUB_PAT}`,
      Accept:                 "application/octet-stream",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    redirect: "follow",
  });

  if (!assetRes.ok) return fail("Failed to fetch asset from GitHub", env, 502);

  // Build a fresh header set — do NOT pass through GitHub/S3 headers,
  // since those force a download via Content-Disposition: attachment
  // and Content-Type: application/octet-stream.
  const headers = new Headers();
  headers.set("Content-Type", SERVE_MIME[asset.ext] ?? "application/octet-stream");
  // "inline" tells the browser to render/display the file, not download it
  headers.set("Content-Disposition", "inline");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Cache-Control", "public, max-age=3600");

  return new Response(assetRes.body, { status: assetRes.status, headers });
}

// ── Create (upload) ────────────────────────────────────────────
export async function create(req: Request, env: Env, kind: ContentKind): Promise<Response> {
  const user = await sessionUser(req, env);
  if (!user) return fail("Unauthorized", env, 401);
  if (!CAN_UPLOAD.has(user.role))
    return fail("You need Developer, Admin, or Owner role to upload content", env, 403);

  // Must be multipart/form-data
  let form: FormData;
  try { form = await req.formData(); }
  catch { return fail("Request must be multipart/form-data", env, 400); }

  const file        = form.get("file");
  const name        = form.get("name")?.toString().trim();
  const author      = form.get("author")?.toString().trim() || user.name;
  const description = form.get("description")?.toString().trim() ?? "";
  const faviconUrl  = form.get("faviconUrl")?.toString().trim() ?? "";
  const posterUrl   = form.get("posterUrl")?.toString().trim() ?? "";
  const readme      = form.get("readme")?.toString() ?? "";

  if (!file || !(file instanceof File)) return fail("file is required", env, 400);
  if (!name) return fail("name is required", env, 400);
  if (file.size > 60 * 1024 * 1024) return fail("File too large — max 60 MB", env, 400);

  const ft = resolveFileType(file.name);
  if (!ft) return fail("Unsupported file type. Allowed: .html .js .png .jpg .gif .webp", env, 400);

  const contentId = nanoid(14);
  const entry: ContentEntry = {
    contentId,
    kind,
    name:        name.slice(0, 100),
    author:      author.slice(0, 60),
    description: description.slice(0, 500),
    faviconUrl,
    posterUrl,
    uploaderUid: user.uid,
    createdAt:   new Date().toISOString(),
  };

  const fileData = await file.arrayBuffer();

  try {
    await publishContent(env, entry, fileData, ft.ext, ft.mime, readme);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return fail(`GitHub publish failed: ${msg}`, env, 502);
  }

  return ok(entry, env, 201);
}

// ── Delete (admin/owner only) ──────────────────────────────────
export async function hardDelete(req: Request, env: Env, kind: ContentKind, contentId: string): Promise<Response> {
  const user = await sessionUser(req, env);
  if (!user) return fail("Unauthorized", env, 401);
  if (user.role !== "admin" && user.role !== "owner")
    return fail("Only admins and owners can delete content", env, 403);

  // Verify it exists
  const all   = await readIndex(env, kind);
  const entry = all.find(e => e.contentId === contentId);
  if (!entry) return fail("Not found", env, 404);

  try {
    await deleteContent(env, kind, contentId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return fail(`GitHub delete failed: ${msg}`, env, 502);
  }

  return ok({ deleted: true, contentId }, env);
}
