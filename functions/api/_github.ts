/**
 * _github.ts — GitHub CDN layer
 *
 * All content (clients, mods, skins) lives in a GitHub repo:
 *   - Root JSON index files: clients.json / mods.json / skins.json
 *   - One release per content item tagged "content-<contentId>"
 *     with 3 assets: readme.md, index.{html|js|png}, metadata.json
 *
 * Env vars required:
 *   GITHUB_PAT    — Personal Access Token (repo + write:packages scope)
 *   CDN_REPO_OWNER — e.g. "EaglercraftXLauncher"
 *   CDN_REPO_NAME  — e.g. "EaglercraftXLauncherCDN"
 */

import type { Env } from "./_types";

// ── Types ──────────────────────────────────────────────────────

export type ContentKind = "client" | "mod" | "skin";

export interface ContentEntry {
  contentId:   string;
  kind:        ContentKind;
  name:        string;
  author:      string;
  faviconUrl:  string;
  posterUrl:   string;
  description: string;
  uploaderUid: string;
  createdAt:   string;
}

export interface ContentMetadata {
  contentId:   string;
  kind:        ContentKind;
  lastUpdated: string;
  fileType:    string; // "html" | "js" | "png"
  fileSize:    number;
}

const INDEX_FILE: Record<ContentKind, string> = {
  client: "clients.json",
  mod:    "mods.json",
  skin:   "skins.json",
};

const BRANCH = "main";

// ── GitHub REST helpers ────────────────────────────────────────

function ghHeaders(pat: string): Record<string, string> {
  return {
    Authorization:          `Bearer ${pat}`,
    Accept:                 "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent":           "eagxl-worker",
  };
}

async function ghFetch(
  pat: string, url: string, init: RequestInit = {}
): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { ...ghHeaders(pat), ...(init.headers as Record<string, string> ?? {}) },
  });
  return res;
}

/** Get a file's content + SHA from the repo (needed for updates). */
async function getFileMeta(
  env: Env, path: string
): Promise<{ content: string; sha: string } | null> {
  const res = await ghFetch(
    env.GITHUB_PAT,
    `https://api.github.com/repos/${env.CDN_REPO_OWNER}/${env.CDN_REPO_NAME}/contents/${path}?ref=${BRANCH}`
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`getFileMeta ${path}: ${res.status}`);
  const data = await res.json() as { content: string; sha: string };
  return data;
}

/** Create or update a text file in the repo. */
async function putFile(
  env: Env,
  path: string,
  content: string,   // raw string — will be base64-encoded
  message: string,
  sha?: string       // required when updating an existing file
): Promise<void> {
  const body: Record<string, unknown> = {
    message,
    content: btoa(unescape(encodeURIComponent(content))), // UTF-8 safe base64
    branch:  BRANCH,
  };
  if (sha) body.sha = sha;

  const res = await ghFetch(
    env.GITHUB_PAT,
    `https://api.github.com/repos/${env.CDN_REPO_OWNER}/${env.CDN_REPO_NAME}/contents/${path}`,
    { method: "PUT", body: JSON.stringify(body) }
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`putFile ${path}: ${res.status} ${t}`);
  }
}

/** Upload a binary asset to an existing release. */
async function uploadReleaseAsset(
  env: Env,
  releaseId: number,
  filename: string,
  mimeType: string,
  data: ArrayBuffer | string
): Promise<void> {
  const body   = typeof data === "string"
    ? new TextEncoder().encode(data)
    : new Uint8Array(data);

  const res = await fetch(
    `https://uploads.github.com/repos/${env.CDN_REPO_OWNER}/${env.CDN_REPO_NAME}/releases/${releaseId}/assets?name=${encodeURIComponent(filename)}`,
    {
      method: "POST",
      headers: {
        ...ghHeaders(env.GITHUB_PAT),
        "Content-Type": mimeType,
      },
      body,
    }
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`uploadReleaseAsset ${filename}: ${res.status} ${t}`);
  }
}

/** Create a GitHub release tagged "content-<contentId>". */
async function createRelease(env: Env, contentId: string, name: string): Promise<number> {
  const res = await ghFetch(
    env.GITHUB_PAT,
    `https://api.github.com/repos/${env.CDN_REPO_OWNER}/${env.CDN_REPO_NAME}/releases`,
    {
      method: "POST",
      body: JSON.stringify({
        tag_name:         `content-${contentId}`,
        name:             `[Content] ${name}`,
        body:             `Auto-generated release for content ID \`${contentId}\`.`,
        draft:            false,
        prerelease:       false,
        generate_release_notes: false,
      }),
    }
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`createRelease: ${res.status} ${t}`);
  }
  const data = await res.json() as { id: number };
  return data.id;
}

/** Delete a release by tag (used on rollback / hard delete). */
async function deleteRelease(env: Env, contentId: string): Promise<void> {
  // 1. Resolve tag → release id
  const tagRes = await ghFetch(
    env.GITHUB_PAT,
    `https://api.github.com/repos/${env.CDN_REPO_OWNER}/${env.CDN_REPO_NAME}/releases/tags/content-${contentId}`
  );
  if (!tagRes.ok) return; // already gone
  const { id } = await tagRes.json() as { id: number };

  // 2. Delete release
  await ghFetch(
    env.GITHUB_PAT,
    `https://api.github.com/repos/${env.CDN_REPO_OWNER}/${env.CDN_REPO_NAME}/releases/${id}`,
    { method: "DELETE" }
  );

  // 3. Delete the tag ref
  await ghFetch(
    env.GITHUB_PAT,
    `https://api.github.com/repos/${env.CDN_REPO_OWNER}/${env.CDN_REPO_NAME}/git/refs/tags/content-${contentId}`,
    { method: "DELETE" }
  );
}

// ── Public API ─────────────────────────────────────────────────

/** Read the index JSON for a content kind. Returns empty array if file missing. */
export async function readIndex(env: Env, kind: ContentKind): Promise<ContentEntry[]> {
  const file = await getFileMeta(env, INDEX_FILE[kind]);
  if (!file) return [];
  try {
    const decoded = decodeURIComponent(escape(atob(file.content.replace(/\n/g, ""))));
    return JSON.parse(decoded) as ContentEntry[];
  } catch {
    return [];
  }
}

/** Append an entry to the index JSON and commit it. */
export async function appendIndex(env: Env, entry: ContentEntry): Promise<void> {
  const path    = INDEX_FILE[entry.kind];
  const file    = await getFileMeta(env, path);
  const current: ContentEntry[] = file
    ? (() => {
        try {
          return JSON.parse(
            decodeURIComponent(escape(atob(file.content.replace(/\n/g, ""))))
          ) as ContentEntry[];
        } catch { return []; }
      })()
    : [];

  current.unshift(entry); // newest first
  await putFile(
    env, path,
    JSON.stringify(current, null, 2),
    `Add ${entry.kind}: ${entry.name} (${entry.contentId})`,
    file?.sha
  );
}

/** Remove an entry from the index JSON and commit it. */
export async function removeFromIndex(env: Env, kind: ContentKind, contentId: string): Promise<void> {
  const path = INDEX_FILE[kind];
  const file = await getFileMeta(env, path);
  if (!file) return;

  let entries: ContentEntry[] = [];
  try {
    entries = JSON.parse(
      decodeURIComponent(escape(atob(file.content.replace(/\n/g, ""))))
    ) as ContentEntry[];
  } catch { return; }

  const filtered = entries.filter(e => e.contentId !== contentId);
  await putFile(
    env, path,
    JSON.stringify(filtered, null, 2),
    `Remove ${kind} ${contentId}`,
    file.sha
  );
}

/**
 * Publish a full content item:
 * 1. Create a GitHub Release tagged content-<contentId>
 * 2. Upload readme.md, index.<ext>, metadata.json as release assets
 * 3. Append entry to the index JSON
 */
export async function publishContent(
  env:         Env,
  entry:       ContentEntry,
  fileData:    ArrayBuffer,
  fileExt:     string,      // "html" | "js" | "png"
  mimeType:    string,
  readmeText:  string,
): Promise<void> {
  // 1. Create release
  const releaseId = await createRelease(env, entry.contentId, entry.name);

  try {
    // 2. Upload readme.md
    const readme = readmeText || `# ${entry.name}\nBy ${entry.author}\n\n${entry.description}`;
    await uploadReleaseAsset(env, releaseId, "readme.md", "text/markdown", readme);

    // 3. Upload index.<ext>
    await uploadReleaseAsset(env, releaseId, `index.${fileExt}`, mimeType, fileData);

    // 4. Upload metadata.json
    const meta: ContentMetadata = {
      contentId:   entry.contentId,
      kind:        entry.kind,
      lastUpdated: new Date().toISOString(),
      fileType:    fileExt,
      fileSize:    fileData.byteLength,
    };
    await uploadReleaseAsset(env, releaseId, "metadata.json", "application/json", JSON.stringify(meta, null, 2));

    // 5. Append to index
    await appendIndex(env, entry);

  } catch (e) {
    // Rollback: delete the release so we don't leave orphaned releases
    await deleteRelease(env, entry.contentId).catch(() => {});
    throw e;
  }
}

/**
 * Delete a content item:
 * 1. Remove from index JSON
 * 2. Delete the GitHub release + tag
 */
export async function deleteContent(env: Env, kind: ContentKind, contentId: string): Promise<void> {
  await removeFromIndex(env, kind, contentId);
  await deleteRelease(env, contentId);
}

/**
 * Get the download URL for a release asset by filename.
 * Returns the api.github.com URL (requires PAT to download).
 */
export async function getAssetUrl(
  env:       Env,
  contentId: string,
  filename:  string
): Promise<string | null> {
  const res = await ghFetch(
    env.GITHUB_PAT,
    `https://api.github.com/repos/${env.CDN_REPO_OWNER}/${env.CDN_REPO_NAME}/releases/tags/content-${contentId}`
  );
  if (!res.ok) return null;
  const release = await res.json() as { assets: Array<{ name: string; url: string }> };
  const asset   = release.assets.find(a => a.name === filename);
  return asset?.url ?? null;
}

/**
 * Find the "index.<ext>" asset for a content item in a single API call
 * (avoids looping over every possible extension).
 * Returns the asset's GitHub API URL and its file extension, or null.
 */
export async function getIndexAsset(
  env:       Env,
  contentId: string
): Promise<{ url: string; ext: string } | null> {
  const res = await ghFetch(
    env.GITHUB_PAT,
    `https://api.github.com/repos/${env.CDN_REPO_OWNER}/${env.CDN_REPO_NAME}/releases/tags/content-${contentId}`
  );
  if (!res.ok) return null;
  const release = await res.json() as { assets: Array<{ name: string; url: string }> };
  const asset = release.assets.find(a => /^index\.[a-zA-Z0-9]+$/.test(a.name));
  if (!asset) return null;
  const ext = asset.name.split(".").pop()!.toLowerCase();
  return { url: asset.url, ext };
}
