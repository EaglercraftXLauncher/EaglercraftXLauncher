import type { Env } from "./_types";
import { ok, fail, sessionUser, nanoid } from "./_utils";
import {
  readIndex, createContent, getManifest, addVersion, addScreenshot,
  addDoc, updateContentMetadata, updateVersionMetadata, deleteVersion, updateDoc, deleteDoc,
  setAutoSync, removeAutoSync, runAutoSync, proxyAsset, deleteContent, listForgeReadyClients,
  type ContentKind, type ClientManifest, type ContentVersion, type AutoSyncConfig,
} from "./_github";

const CAN_UPLOAD = new Set(["developer", "admin", "owner"]);

async function canManageContent(req: Request, env: Env, contentId: string): Promise<{ ok: true } | { ok: false; response: Response }> {
  const user = await sessionUser(req, env);
  if (!user) return { ok: false, response: fail("Unauthorized", env, 401) };
  const manifest = await getManifest(env, contentId);
  if (!manifest) return { ok: false, response: fail("Not found", env, 404) };
  if (user.role === "admin" || user.role === "owner" || (user.role === "developer" && manifest.uploaderUid === user.uid)) {
    return { ok: true };
  }
  return { ok: false, response: fail("Forbidden", env, 403) };
}

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

// ── List EaglerForge-ready base clients (optionally filtered) ───
export async function listForgeClients(req: Request, env: Env): Promise<Response> {
  const mcVersionRaw = new URL(req.url).searchParams.get("mcVersion");
  const mcVersion = mcVersionRaw === "1.8" || mcVersionRaw === "1.12" ? mcVersionRaw : undefined;
  const clients = await listForgeReadyClients(env, mcVersion);
  return ok({ items: clients }, env);
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
  const mcVersionRaw   = form.get("mcVersion")?.toString().trim();
  const forgeReadyRaw  = form.get("forgeReady")?.toString().trim();

  if (!file || !(file instanceof File)) return fail("file is required", env, 400);
  if (!name) return fail("name is required", env, 400);
  if (file.size > 500 * 1024 * 1024) return fail("File too large — max 500 MB", env, 400);

  const ft = resolveFile(file.name);
  if (!ft) return fail("Unsupported file type", env, 400);

  // Mods must declare which EaglerForge Minecraft version they target,
  // since mods are version-specific and can't run against a mismatched
  // base client.
  let mcVersion: "1.8" | "1.12" | undefined;
  if (kind === "mod") {
    if (mcVersionRaw !== "1.8" && mcVersionRaw !== "1.12")
      return fail("mcVersion must be \"1.8\" or \"1.12\" for mods", env, 400);
    mcVersion = mcVersionRaw;
  }
  const forgeReady = kind === "client" ? forgeReadyRaw === "true" : undefined;
  if (forgeReady) {
    if (mcVersionRaw !== "1.8" && mcVersionRaw !== "1.12")
      return fail("mcVersion must be \"1.8\" or \"1.12\" for forge-ready clients", env, 400);
    mcVersion = mcVersionRaw;
  }

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
      mcVersion:  kind === "mod" ? mcVersion : undefined,
    }],
    screenshots: [],
    docs:        [],
    autoSync:    null,
    forgeReady,
    mcVersion:   kind === "client" ? mcVersion : undefined,
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
  const allowed = await canManageContent(req, env, contentId);
  if (!allowed.ok) return allowed.response;

  let form: FormData;
  try { form = await req.formData(); } catch { return fail("Multipart form required", env, 400); }

  const file       = form.get("file");
  const versionTag = form.get("versionTag")?.toString().trim();
  const changelog  = form.get("changelog")?.toString().trim() ?? "";
  const mcVersionRaw = form.get("mcVersion")?.toString().trim();

  if (!file || !(file instanceof File)) return fail("file is required", env, 400);
  if (!versionTag) return fail("versionTag is required", env, 400);

  const ft = resolveFile(file.name);
  if (!ft) return fail("Unsupported file type", env, 400);

  const manifestKind = (await getManifest(env, contentId))?.kind;
  let mcVersion: "1.8" | "1.12" | undefined;
  if (manifestKind === "mod") {
    if (mcVersionRaw !== "1.8" && mcVersionRaw !== "1.12")
      return fail("mcVersion must be \"1.8\" or \"1.12\" for mods", env, 400);
    mcVersion = mcVersionRaw;
  }

  const version: ContentVersion = {
    tag:        versionTag,
    filename:   "",
    label:      versionTag,
    changelog,
    uploadedAt: new Date().toISOString(),
    isLatest:   true,
    mcVersion,
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
  const allowed = await canManageContent(req, env, contentId);
  if (!allowed.ok) return allowed.response;

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
  const allowed = await canManageContent(req, env, contentId);
  if (!allowed.ok) return allowed.response;

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


// ── Update content metadata ───────────────────────────────────
export async function updateContent(req: Request, env: Env, contentId: string): Promise<Response> {
  const allowed = await canManageContent(req, env, contentId);
  if (!allowed.ok) return allowed.response;

  let body: { name?: string; description?: string; faviconUrl?: string; posterUrl?: string; bannerUrl?: string; tags?: string[]; forgeReady?: boolean; mcVersion?: "1.8" | "1.12" };
  try { body = await req.json(); } catch { return fail("JSON required", env, 400); }

  if (body.forgeReady && body.mcVersion !== "1.8" && body.mcVersion !== "1.12")
    return fail("mcVersion must be \"1.8\" or \"1.12\" when forgeReady is true", env, 400);

  try {
    const manifest = await updateContentMetadata(env, contentId, {
      name: body.name?.trim(),
      description: body.description?.trim(),
      faviconUrl: body.faviconUrl?.trim(),
      posterUrl: body.posterUrl?.trim(),
      bannerUrl: body.bannerUrl?.trim(),
      tags: Array.isArray(body.tags) ? body.tags.map(t => String(t).trim()).filter(Boolean) : undefined,
      forgeReady: body.forgeReady,
      mcVersion: body.mcVersion,
    });
    return ok(manifest, env);
  } catch (e) {
    return fail(`Update failed: ${e instanceof Error ? e.message : "unknown"}`, env, 502);
  }
}

// ── Update/delete version metadata ─────────────────────────────
export async function updateVersion(req: Request, env: Env, contentId: string, tag: string): Promise<Response> {
  const allowed = await canManageContent(req, env, contentId);
  if (!allowed.ok) return allowed.response;
  let body: { tag?: string; label?: string; changelog?: string; isLatest?: boolean; mcVersion?: "1.8" | "1.12" };
  try { body = await req.json(); } catch { return fail("JSON required", env, 400); }
  try {
    const manifest = await updateVersionMetadata(env, contentId, decodeURIComponent(tag), {
      tag: body.tag?.trim(), label: body.label?.trim(), changelog: body.changelog, isLatest: body.isLatest,
      mcVersion: body.mcVersion,
    });
    return ok(manifest, env);
  } catch (e) {
    return fail(`Version update failed: ${e instanceof Error ? e.message : "unknown"}`, env, 502);
  }
}

export async function removeVersion(req: Request, env: Env, contentId: string, tag: string): Promise<Response> {
  const allowed = await canManageContent(req, env, contentId);
  if (!allowed.ok) return allowed.response;
  try { return ok(await deleteVersion(env, contentId, decodeURIComponent(tag)), env); }
  catch (e) { return fail(`Version delete failed: ${e instanceof Error ? e.message : "unknown"}`, env, 502); }
}

// ── Update/delete docs ─────────────────────────────────────────
export async function editDoc(req: Request, env: Env, contentId: string, filename: string): Promise<Response> {
  const allowed = await canManageContent(req, env, contentId);
  if (!allowed.ok) return allowed.response;
  let body: { name?: string; content?: string };
  try { body = await req.json(); } catch { return fail("JSON required", env, 400); }
  if (!body.name?.trim()) return fail("name is required", env, 400);
  if (body.content === undefined) return fail("content is required", env, 400);
  try { return ok(await updateDoc(env, contentId, decodeURIComponent(filename), body.name.trim(), body.content), env); }
  catch (e) { return fail(`Doc update failed: ${e instanceof Error ? e.message : "unknown"}`, env, 502); }
}

export async function removeDoc(req: Request, env: Env, contentId: string, filename: string): Promise<Response> {
  const allowed = await canManageContent(req, env, contentId);
  if (!allowed.ok) return allowed.response;
  try { return ok(await deleteDoc(env, contentId, decodeURIComponent(filename)), env); }
  catch (e) { return fail(`Doc delete failed: ${e instanceof Error ? e.message : "unknown"}`, env, 502); }
}

// ── Auto-sync config ───────────────────────────────────────────
export async function updateAutoSync(req: Request, env: Env, contentId: string): Promise<Response> {
  const allowed = await canManageContent(req, env, contentId);
  if (!allowed.ok) return allowed.response;

  let body: Partial<AutoSyncConfig> & { disable?: boolean };
  try { body = await req.json(); } catch { return fail("JSON required", env, 400); }

  if (body.disable) {
    if (!body.versionTag?.trim()) return fail("versionTag is required", env, 400);
    await removeAutoSync(env, contentId, body.versionTag.trim());
    return ok({ versionTag: body.versionTag.trim() }, env);
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
  const allowed = await canManageContent(req, env, contentId);
  if (!allowed.ok) return allowed.response;

  const versionTag = new URL(req.url).searchParams.get("versionTag") ?? undefined;
  const result = await runAutoSync(env, contentId, versionTag);
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
