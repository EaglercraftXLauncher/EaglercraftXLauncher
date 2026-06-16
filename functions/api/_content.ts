import type { Env } from "./_types";
import { ok, fail, sessionUser, nanoid } from "./_utils";
import {
  readIndex, createContent, getManifest, addVersion, addScreenshot,
  addDoc, setAutoSync, runAutoSync, proxyAsset, deleteContent,
  type ContentKind, type ClientManifest, type ContentVersion, type AutoSyncConfig,
} from "./_github";

const CAN_UPLOAD = new Set(["developer", "admin", "owner"]);

const MIME_MAP: Record<string, { ext: string; mime: string }> = {
  ".html": { ext: "html", mime: "text/html" },
  ".js":   { ext: "js",   mime: "application/javascript" },
  ".png":  { ext: "png",  mime: "image/png" },
  ".jpg":  { ext: "jpg",  mime: "image/jpeg" },
  ".jpeg": { ext: "jpeg", mime: "image/jpeg" },
  ".gif":  { ext: "gif",  mime: "image/gif" },
  ".webp": { ext: "webp", mime: "image/webp" },
};

function resolveFile(filename: string) {
  const dot = filename.toLowerCase().lastIndexOf(".");
  if (dot === -1) return null;
  return MIME_MAP[filename.toLowerCase().slice(dot)] ?? null;
}

// ── Browse index ───────────────────────────────────────────────
export async function browse(req: Request, env: Env, kind: ContentKind): Promise<Response> {
  const sp     = new URL(req.url).searchParams;
  const q      = sp.get("q")?.toLowerCase() ?? "";
  const limit  = Math.min(Number(sp.get("limit") ?? 24), 100);
  const offset = Number(sp.get("offset") ?? 0);
  const all    = await readIndex(env, kind);
  const filtered = q ? all.filter(e => `${e.name} ${e.description} ${e.author}`.toLowerCase().includes(q)) : all;
  return ok({ items: filtered.slice(offset, offset + limit), total: filtered.length, limit, offset }, env);
}

// ── Get full manifest ──────────────────────────────────────────
export async function getDetail(_req: Request, env: Env, contentId: string): Promise<Response> {
  const manifest = await getManifest(env, contentId);
  if (!manifest) return fail("Not found", env, 404);
  return ok(manifest, env);
}

// ── Create new content ─────────────────────────────────────────
export async function create(req: Request, env: Env, kind: ContentKind): Promise<Response> {
  const user = await sessionUser(req, env);
  if (!user) return fail("Unauthorized", env, 401);
  if (!CAN_UPLOAD.has(user.role)) return fail("Developer, Admin, or Owner role required", env, 403);

  let form: FormData;
  try { form = await req.formData(); } catch { return fail("Multipart form required", env, 400); }

  const file        = form.get("file");
  const name        = form.get("name")?.toString().trim();
  const author      = form.get("author")?.toString().trim() || user.name;
  const description = form.get("description")?.toString().trim() ?? "";
  const faviconUrl  = form.get("faviconUrl")?.toString().trim() ?? "";
  const posterUrl   = form.get("posterUrl")?.toString().trim() ?? "";
  const bannerUrl   = form.get("bannerUrl")?.toString().trim() ?? "";
  const versionTag  = form.get("versionTag")?.toString().trim() || "v1.0";
  const changelog   = form.get("changelog")?.toString().trim() ?? "";
  const readme      = form.get("readme")?.toString() ?? "";
  const tagsRaw     = form.get("tags")?.toString() ?? "";

  if (!file || !(file instanceof File)) return fail("file is required", env, 400);
  if (!name) return fail("name is required", env, 400);
  if (file.size > 60 * 1024 * 1024) return fail("File too large — max 60 MB", env, 400);

  const ft = resolveFile(file.name);
  if (!ft) return fail("Unsupported file type", env, 400);

  const now       = new Date().toISOString();
  const contentId = nanoid(14);
  const manifest: ClientManifest = {
    contentId,
    kind,
    name:        name.slice(0, 100),
    author:      author.slice(0, 60),
    description: description.slice(0, 1000),
    faviconUrl, posterUrl, bannerUrl,
    tags:        tagsRaw.split(",").map(t => t.trim()).filter(Boolean).slice(0, 15),
    uploaderUid: user.uid,
    createdAt:   now,
    updatedAt:   now,
    versions: [{
      tag:        versionTag,
      filename:   "",      // filled in by createContent
      label:      versionTag,
      changelog,
      uploadedAt: now,
      isLatest:   true,
    }],
    screenshots: [],
    docs:        [],
    autoSync:    null,
  };

  try {
    await createContent(env, manifest, await file.arrayBuffer(), ft.ext, ft.mime, readme);
  } catch (e) {
    return fail(`Publish failed: ${e instanceof Error ? e.message : "unknown"}`, env, 502);
  }

  return ok({ contentId, name }, env, 201);
}

// ── Add version ────────────────────────────────────────────────
export async function uploadVersion(req: Request, env: Env, contentId: string): Promise<Response> {
  const user = await sessionUser(req, env);
  if (!user) return fail("Unauthorized", env, 401);
  if (!CAN_UPLOAD.has(user.role)) return fail("Forbidden", env, 403);

  let form: FormData;
  try { form = await req.formData(); } catch { return fail("Multipart form required", env, 400); }

  const file       = form.get("file");
  const versionTag = form.get("versionTag")?.toString().trim();
  const changelog  = form.get("changelog")?.toString().trim() ?? "";

  if (!file || !(file instanceof File)) return fail("file is required", env, 400);
  if (!versionTag) return fail("versionTag is required", env, 400);

  const ft = resolveFile(file.name);
  if (!ft) return fail("Unsupported file type", env, 400);

  const version: ContentVersion = {
    tag:        versionTag,
    filename:   "",
    label:      versionTag,
    changelog,
    uploadedAt: new Date().toISOString(),
    isLatest:   true,
  };

  try {
    const manifest = await addVersion(env, contentId, version, await file.arrayBuffer(), ft.ext, ft.mime);
    return ok(manifest, env);
  } catch (e) {
    return fail(`Version upload failed: ${e instanceof Error ? e.message : "unknown"}`, env, 502);
  }
}

// ── Add screenshot ─────────────────────────────────────────────
export async function uploadScreenshot(req: Request, env: Env, contentId: string): Promise<Response> {
  const user = await sessionUser(req, env);
  if (!user) return fail("Unauthorized", env, 401);
  if (!CAN_UPLOAD.has(user.role)) return fail("Forbidden", env, 403);

  let form: FormData;
  try { form = await req.formData(); } catch { return fail("Multipart form required", env, 400); }

  const file = form.get("file");
  if (!file || !(file instanceof File)) return fail("file is required", env, 400);
  const ft = resolveFile(file.name);
  if (!ft) return fail("Unsupported file type", env, 400);

  try {
    const filename = await addScreenshot(env, contentId, await file.arrayBuffer(), ft.ext, ft.mime);
    return ok({ filename }, env, 201);
  } catch (e) {
    return fail(`Screenshot upload failed: ${e instanceof Error ? e.message : "unknown"}`, env, 502);
  }
}

// ── Add doc ────────────────────────────────────────────────────
export async function uploadDoc(req: Request, env: Env, contentId: string): Promise<Response> {
  const user = await sessionUser(req, env);
  if (!user) return fail("Unauthorized", env, 401);
  if (!CAN_UPLOAD.has(user.role)) return fail("Forbidden", env, 403);

  let body: { name?: string; content?: string };
  try { body = await req.json(); } catch { return fail("JSON required", env, 400); }

  if (!body.name?.trim()) return fail("name is required", env, 400);
  if (!body.content?.trim()) return fail("content is required", env, 400);

  try {
    await addDoc(env, contentId, body.name.trim(), body.content);
    return ok({ ok: true }, env);
  } catch (e) {
    return fail(`Doc upload failed: ${e instanceof Error ? e.message : "unknown"}`, env, 502);
  }
}

// ── Auto-sync config ───────────────────────────────────────────
export async function updateAutoSync(req: Request, env: Env, contentId: string): Promise<Response> {
  const user = await sessionUser(req, env);
  if (!user) return fail("Unauthorized", env, 401);
  if (!CAN_UPLOAD.has(user.role)) return fail("Forbidden", env, 403);

  let body: Partial<AutoSyncConfig> & { disable?: boolean };
  try { body = await req.json(); } catch { return fail("JSON required", env, 400); }

  if (body.disable) {
    await setAutoSync(env, contentId, null);
    return ok({ autoSync: null }, env);
  }

  if (!body.sourceUrl?.trim()) return fail("sourceUrl is required", env, 400);
  if (!body.versionTag?.trim()) return fail("versionTag is required", env, 400);

  const config: AutoSyncConfig = {
    enabled:     body.enabled ?? true,
    sourceUrl:   body.sourceUrl.trim(),
    versionTag:  body.versionTag.trim(),
    lastSyncAt:  null,
    lastSyncOk:  null,
    lastSyncMsg: null,
  };

  try {
    await setAutoSync(env, contentId, config);
    return ok({ autoSync: config }, env);
  } catch (e) {
    return fail(`Auto-sync config failed: ${e instanceof Error ? e.message : "unknown"}`, env, 502);
  }
}

// ── Trigger auto-sync ──────────────────────────────────────────
export async function triggerSync(req: Request, env: Env, contentId: string): Promise<Response> {
  const user = await sessionUser(req, env);
  if (!user) return fail("Unauthorized", env, 401);
  if (!CAN_UPLOAD.has(user.role)) return fail("Forbidden", env, 403);

  const result = await runAutoSync(env, contentId);
  return ok(result, env, result.ok ? 200 : 502);
}

// ── Proxy asset ────────────────────────────────────────────────
export async function serveAsset(_req: Request, env: Env, contentId: string, assetPath: string): Promise<Response> {
  const res = await proxyAsset(env, contentId, assetPath);
  if (!res) return fail("Asset not found", env, 404);
  return res;
}

// ── Delete content ─────────────────────────────────────────────
export async function hardDelete(req: Request, env: Env, kind: ContentKind, contentId: string): Promise<Response> {
  const user = await sessionUser(req, env);
  if (!user) return fail("Unauthorized", env, 401);
  if (user.role !== "admin" && user.role !== "owner") return fail("Forbidden", env, 403);

  const all = await readIndex(env, kind);
  if (!all.find(e => e.contentId === contentId)) return fail("Not found", env, 404);

  try {
    await deleteContent(env, kind, contentId);
    return ok({ deleted: true, contentId }, env);
  } catch (e) {
    return fail(`Delete failed: ${e instanceof Error ? e.message : "unknown"}`, env, 502);
  }
}
