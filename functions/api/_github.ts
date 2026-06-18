import type { Env } from "./_types";

export type ContentKind = "client" | "mod" | "skin";

export interface ContentVersion {
  tag: string; filename: string; label: string;
  changelog: string; uploadedAt: string; isLatest: boolean;
}
export interface AutoSyncConfig {
  enabled: boolean; sourceUrl: string; versionTag: string;
  lastSyncAt: string | null; lastSyncOk: boolean | null; lastSyncMsg: string | null;
}
export interface ClientManifest {
  contentId: string; kind: ContentKind; name: string; author: string;
  description: string; faviconUrl: string; posterUrl: string; bannerUrl: string;
  tags: string[]; uploaderUid: string; createdAt: string; updatedAt: string;
  versions: ContentVersion[]; screenshots: string[]; docs: string[];
  autoSync: AutoSyncConfig | null;
}
export interface IndexEntry {
  contentId: string; kind: ContentKind; name: string; author: string;
  faviconUrl: string; posterUrl: string; description: string;
  uploaderUid: string; createdAt: string; latestTag: string | null;
}

const INDEX_FILE: Record<ContentKind, string> = {
  client: "clients.json", mod: "mods.json", skin: "skins.json",
};

function branch(env: Env): string { return env.CDN_REPO_BRANCH?.trim() || "main"; }

function versionAssetFilename(tag: string, ext: string): string {
  return `versions.${tag}.${ext}`;
}

function ghHeaders(pat: string): Record<string, string> {
  return {
    Authorization: `Bearer ${pat}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "eagxl-worker",
  };
}

async function ghFetch(pat: string, url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...init, headers: { ...ghHeaders(pat), ...(init.headers as Record<string,string> ?? {}) } });
}

interface ReleaseAsset { id: number; name: string; url: string; size: number; }

async function getFileMeta(env: Env, path: string): Promise<{ content: string; sha: string } | null> {
  const res = await ghFetch(env.GITHUB_PAT,
    `https://api.github.com/repos/${env.CDN_REPO_OWNER}/${env.CDN_REPO_NAME}/contents/${path}?ref=${branch(env)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`getFileMeta ${path}: ${res.status}`);
  return res.json() as Promise<{ content: string; sha: string }>;
}

async function putFile(env: Env, path: string, content: string, message: string, sha?: string): Promise<void> {
  const body: Record<string, unknown> = {
    message, content: btoa(unescape(encodeURIComponent(content))), branch: branch(env),
  };
  if (sha) body.sha = sha;
  const res = await ghFetch(env.GITHUB_PAT,
    `https://api.github.com/repos/${env.CDN_REPO_OWNER}/${env.CDN_REPO_NAME}/contents/${path}`,
    { method: "PUT", body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`putFile ${path}: ${res.status} ${await res.text()}`);
}

async function uploadAsset(env: Env, releaseId: number, filename: string, mime: string, data: ArrayBuffer | string): Promise<void> {
  const body = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  const res = await fetch(
    `https://uploads.github.com/repos/${env.CDN_REPO_OWNER}/${env.CDN_REPO_NAME}/releases/${releaseId}/assets?name=${encodeURIComponent(filename)}`,
    { method: "POST", headers: { ...ghHeaders(env.GITHUB_PAT), "Content-Type": mime }, body });
  if (!res.ok) throw new Error(`uploadAsset ${filename}: ${res.status} ${await res.text()}`);
}

async function deleteAsset(env: Env, assetId: number): Promise<void> {
  await ghFetch(env.GITHUB_PAT,
    `https://api.github.com/repos/${env.CDN_REPO_OWNER}/${env.CDN_REPO_NAME}/releases/assets/${assetId}`,
    { method: "DELETE" });
}

async function getRelease(env: Env, contentId: string): Promise<{ id: number; assets: ReleaseAsset[] } | null> {
  const res = await ghFetch(env.GITHUB_PAT,
    `https://api.github.com/repos/${env.CDN_REPO_OWNER}/${env.CDN_REPO_NAME}/releases/tags/content-${contentId}`);
  if (!res.ok) return null;
  return res.json() as Promise<{ id: number; assets: ReleaseAsset[] }>;
}

function decodeIndex(content: string): IndexEntry[] {
  try { return JSON.parse(decodeURIComponent(escape(atob(content.replace(/\n/g, ""))))) as IndexEntry[]; }
  catch { return []; }
}

export async function readIndex(env: Env, kind: ContentKind): Promise<IndexEntry[]> {
  const file = await getFileMeta(env, INDEX_FILE[kind]);
  if (!file) return [];
  return decodeIndex(file.content);
}

export async function appendIndex(env: Env, entry: IndexEntry): Promise<void> {
  const path = INDEX_FILE[entry.kind];
  const file = await getFileMeta(env, path);
  const current = file ? decodeIndex(file.content) : [];
  current.unshift(entry);
  await putFile(env, path, JSON.stringify(current, null, 2),
    `Add ${entry.kind}: ${entry.name} (${entry.contentId})`, file?.sha);
}

export async function updateIndexEntry(env: Env, kind: ContentKind, contentId: string, updates: Partial<IndexEntry>): Promise<void> {
  const path = INDEX_FILE[kind];
  const file = await getFileMeta(env, path);
  if (!file) return;
  const entries = decodeIndex(file.content);
  const idx = entries.findIndex(e => e.contentId === contentId);
  if (idx === -1) return;
  entries[idx] = { ...entries[idx], ...updates };
  await putFile(env, path, JSON.stringify(entries, null, 2), `Update ${kind} ${contentId}`, file.sha);
}

export async function removeFromIndex(env: Env, kind: ContentKind, contentId: string): Promise<void> {
  const path = INDEX_FILE[kind];
  const file = await getFileMeta(env, path);
  if (!file) return;
  const entries = decodeIndex(file.content).filter(e => e.contentId !== contentId);
  await putFile(env, path, JSON.stringify(entries, null, 2), `Remove ${kind} ${contentId}`, file.sha);
}

async function proxyFetch(env: Env, assetUrl: string): Promise<Response | null> {
  let res = await fetch(assetUrl, {
    headers: { ...ghHeaders(env.GITHUB_PAT), Accept: "application/octet-stream" },
    redirect: "manual",
  });
  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get("location");
    if (loc) res = await fetch(loc);
  }
  return res.ok ? res : null;
}

export async function getManifest(env: Env, contentId: string): Promise<ClientManifest | null> {
  const release = await getRelease(env, contentId);
  if (!release) return null;
  const asset = release.assets.find(a => a.name === "metadata.json");
  if (!asset) return null;
  const res = await proxyFetch(env, asset.url);
  if (!res) return null;
  try { return await res.json() as ClientManifest; } catch { return null; }
}

async function saveManifest(env: Env, releaseId: number, manifest: ClientManifest, assets: ReleaseAsset[]): Promise<void> {
  const old = assets.find(a => a.name === "metadata.json");
  if (old) await deleteAsset(env, old.id);
  await uploadAsset(env, releaseId, "metadata.json", "application/json", JSON.stringify(manifest, null, 2));
}

export async function createContent(env: Env, manifest: ClientManifest, fileData: ArrayBuffer, fileExt: string, fileMime: string, readmeText: string): Promise<void> {
  const res = await ghFetch(env.GITHUB_PAT,
    `https://api.github.com/repos/${env.CDN_REPO_OWNER}/${env.CDN_REPO_NAME}/releases`,
    { method: "POST", body: JSON.stringify({
        tag_name: `content-${manifest.contentId}`, name: manifest.contentId,
        body: `**${manifest.name}** by ${manifest.author}\n\n${manifest.description}`,
        draft: false, prerelease: false, generate_release_notes: false,
    })});
  if (!res.ok) throw new Error(`createRelease: ${res.status} ${await res.text()}`);
  const { id: releaseId } = await res.json() as { id: number };

  try {
    await uploadAsset(env, releaseId, "readme.md", "text/markdown",
      readmeText || `# ${manifest.name}\nBy ${manifest.author}\n\n${manifest.description}`);
    const versionFilename = versionAssetFilename(manifest.versions[0].tag, fileExt);
    await uploadAsset(env, releaseId, versionFilename, fileMime, fileData);
    manifest.versions[0].filename = versionFilename;
    await uploadAsset(env, releaseId, "metadata.json", "application/json", JSON.stringify(manifest, null, 2));
    const indexEntry: IndexEntry = {
      contentId: manifest.contentId, kind: manifest.kind, name: manifest.name,
      author: manifest.author, description: manifest.description,
      faviconUrl: manifest.faviconUrl, posterUrl: manifest.posterUrl,
      uploaderUid: manifest.uploaderUid, createdAt: manifest.createdAt,
      latestTag: manifest.versions[0].tag,
    };
    await appendIndex(env, indexEntry);
  } catch (e) {
    await deleteContent(env, manifest.kind, manifest.contentId).catch(() => {});
    throw e;
  }
}

export async function addVersion(env: Env, contentId: string, version: ContentVersion, fileData: ArrayBuffer, fileExt: string, fileMime: string): Promise<ClientManifest> {
  const release = await getRelease(env, contentId);
  if (!release) throw new Error("Release not found");
  const filename = versionAssetFilename(version.tag, fileExt);
  const existing = release.assets.find(a => a.name === filename);
  if (existing) await deleteAsset(env, existing.id);
  await uploadAsset(env, release.id, filename, fileMime, fileData);
  const manifest = await getManifest(env, contentId);
  if (!manifest) throw new Error("Manifest not found");
  version.filename = filename; version.isLatest = true;
  manifest.versions = manifest.versions.map(v => ({ ...v, isLatest: false }));
  manifest.versions.unshift(version);
  manifest.updatedAt = new Date().toISOString();
  await saveManifest(env, release.id, manifest, release.assets);
  await updateIndexEntry(env, manifest.kind, contentId, { latestTag: version.tag });
  return manifest;
}

export async function addScreenshot(env: Env, contentId: string, fileData: ArrayBuffer, fileExt: string, fileMime: string): Promise<string> {
  const release = await getRelease(env, contentId);
  if (!release) throw new Error("Release not found");
  const filename = `screenshots/${Date.now()}.${fileExt}`;
  await uploadAsset(env, release.id, filename, fileMime, fileData);
  const manifest = await getManifest(env, contentId);
  if (!manifest) throw new Error("Manifest not found");
  manifest.screenshots.push(filename);
  manifest.updatedAt = new Date().toISOString();
  await saveManifest(env, release.id, manifest, release.assets);
  return filename;
}

export async function addDoc(env: Env, contentId: string, docName: string, content: string): Promise<void> {
  const release = await getRelease(env, contentId);
  if (!release) throw new Error("Release not found");
  const filename = `docs/${docName.replace(/[^a-zA-Z0-9._-]/g, "_")}.md`;
  const existing = release.assets.find(a => a.name === filename);
  if (existing) await deleteAsset(env, existing.id);
  await uploadAsset(env, release.id, filename, "text/markdown", content);
  const manifest = await getManifest(env, contentId);
  if (!manifest) throw new Error("Manifest not found");
  if (!manifest.docs.includes(filename)) manifest.docs.push(filename);
  manifest.updatedAt = new Date().toISOString();
  await saveManifest(env, release.id, manifest, release.assets);
}

export async function setAutoSync(env: Env, contentId: string, config: AutoSyncConfig | null): Promise<void> {
  const release = await getRelease(env, contentId);
  if (!release) throw new Error("Release not found");
  const manifest = await getManifest(env, contentId);
  if (!manifest) throw new Error("Manifest not found");
  manifest.autoSync = config; manifest.updatedAt = new Date().toISOString();
  await saveManifest(env, release.id, manifest, release.assets);
}

export async function runAutoSync(env: Env, contentId: string): Promise<{ ok: boolean; msg: string }> {
  const release = await getRelease(env, contentId);
  if (!release) return { ok: false, msg: "Release not found" };
  const manifest = await getManifest(env, contentId);
  if (!manifest) return { ok: false, msg: "Manifest not found" };
  if (!manifest.autoSync?.enabled) return { ok: false, msg: "Auto-sync not enabled" };
  const { sourceUrl, versionTag } = manifest.autoSync;
  const version = manifest.versions.find(v => v.tag === versionTag);
  if (!version) return { ok: false, msg: `Version ${versionTag} not found` };
  let remoteRes: Response;
  try {
    remoteRes = await fetch(sourceUrl, { redirect: "follow" });
    if (!remoteRes.ok) throw new Error(`Remote responded ${remoteRes.status}`);
  } catch (e) {
    const msg = `Fetch failed: ${e instanceof Error ? e.message : String(e)}`;
    manifest.autoSync.lastSyncAt = new Date().toISOString();
    manifest.autoSync.lastSyncOk = false; manifest.autoSync.lastSyncMsg = msg;
    await saveManifest(env, release.id, manifest, release.assets);
    return { ok: false, msg };
  }
  const fileData = await remoteRes.arrayBuffer();
  const urlExt   = sourceUrl.split("?")[0].split(".").pop()?.toLowerCase() ?? "html";
  const ext      = ["html","js","png","jpg","gif","webp"].includes(urlExt) ? urlExt : "html";
  const mime     = remoteRes.headers.get("content-type")?.split(";")[0] ?? "text/html";
  const filename = versionAssetFilename(versionTag, ext);
  const old = release.assets.find(a => a.name === filename);
  if (old) await deleteAsset(env, old.id);
  await uploadAsset(env, release.id, filename, mime, fileData);
  version.filename = filename; version.uploadedAt = new Date().toISOString();
  manifest.autoSync.lastSyncAt = new Date().toISOString();
  manifest.autoSync.lastSyncOk = true;
  manifest.autoSync.lastSyncMsg = `Synced ${fileData.byteLength} bytes from ${sourceUrl}`;
  manifest.updatedAt = new Date().toISOString();
  await saveManifest(env, release.id, manifest, release.assets);
  return { ok: true, msg: manifest.autoSync.lastSyncMsg };
}

export async function proxyAsset(env: Env, contentId: string, assetFilename: string): Promise<Response | null> {
  const release = await getRelease(env, contentId);
  if (!release) return null;
  const legacyVersionFilename = assetFilename.replace(/^versions\//, "versions.");
  const slashVersionFilename = assetFilename.replace(/^versions\./, "versions/");
  const asset = release.assets.find(a => a.name === assetFilename)
    ?? release.assets.find(a => a.name === legacyVersionFilename)
    ?? release.assets.find(a => a.name === slashVersionFilename);
  if (!asset) return null;
  const res = await proxyFetch(env, asset.url);
  if (!res) return null;
  const ext = assetFilename.split(".").pop()?.toLowerCase() ?? "";
  const mimeMap: Record<string, string> = {
    html: "text/html; charset=utf-8", js: "application/javascript; charset=utf-8",
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    gif: "image/gif", webp: "image/webp",
    md: "text/markdown; charset=utf-8", json: "application/json; charset=utf-8",
  };
  const headers = new Headers();
  headers.set("Content-Type", mimeMap[ext] ?? "application/octet-stream");
  headers.set("Content-Disposition", "inline");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Cache-Control", "public, max-age=1800");
  return new Response(res.body, { status: res.status, headers });
}

export async function deleteContent(env: Env, kind: ContentKind, contentId: string): Promise<void> {
  await removeFromIndex(env, kind, contentId);
  const tagRes = await ghFetch(env.GITHUB_PAT,
    `https://api.github.com/repos/${env.CDN_REPO_OWNER}/${env.CDN_REPO_NAME}/releases/tags/content-${contentId}`);
  if (!tagRes.ok) return;
  const { id } = await tagRes.json() as { id: number };
  await ghFetch(env.GITHUB_PAT,
    `https://api.github.com/repos/${env.CDN_REPO_OWNER}/${env.CDN_REPO_NAME}/releases/${id}`,
    { method: "DELETE" });
  await ghFetch(env.GITHUB_PAT,
    `https://api.github.com/repos/${env.CDN_REPO_OWNER}/${env.CDN_REPO_NAME}/git/refs/tags/content-${contentId}`,
    { method: "DELETE" });
}
