import type { Env, ContentEntry, ContentType, ContentCategory } from "./_types";
import { nanoid, ok, fail, sessionUser } from "./_utils";

async function getIndex(env: Env, type: ContentType, cat: ContentCategory): Promise<string[]> {
  const raw = await env.CONTENT_INDEX.get(`${type}:${cat}`);
  return raw ? (JSON.parse(raw) as string[]) : [];
}
async function addToIndex(env: Env, type: ContentType, cat: ContentCategory, id: string) {
  const ids = await getIndex(env, type, cat);
  await env.CONTENT_INDEX.put(`${type}:${cat}`, JSON.stringify([id, ...ids.filter(i => i !== id)].slice(0, 500)));
}
async function removeFromIndex(env: Env, type: ContentType, cat: ContentCategory, id: string) {
  const ids = await getIndex(env, type, cat);
  await env.CONTENT_INDEX.put(`${type}:${cat}`, JSON.stringify(ids.filter(i => i !== id)));
}

export async function getEntry(env: Env, id: string): Promise<ContentEntry | null> {
  const raw = await env.CONTENT.get(`content:${id}`);
  return raw ? (JSON.parse(raw) as ContentEntry) : null;
}
async function saveEntry(env: Env, e: ContentEntry) {
  await env.CONTENT.put(`content:${e.id}`, JSON.stringify(e));
}

export async function browse(req: Request, env: Env, type: ContentType): Promise<Response> {
  const sp       = new URL(req.url).searchParams;
  const category = (sp.get("category") ?? "default") as ContentCategory;
  const limit    = Math.min(Number(sp.get("limit") ?? 20), 100);
  const offset   = Number(sp.get("offset") ?? 0);
  const q        = sp.get("q")?.toLowerCase() ?? "";

  const user = await sessionUser(req, env);
  if (category === "archive" && (!user || user.role === "user"))
    return fail("Forbidden", env, 403);

  const ids     = await getIndex(env, type, category);
  const entries = (await Promise.all(ids.map(id => getEntry(env, id))))
    .filter((e): e is ContentEntry => e !== null)
    .filter(e => e.approved || (user && (user.role !== "user" || e.uploaderUid === user.uid)))
    .filter(e => !q || `${e.title} ${e.description}`.toLowerCase().includes(q));

  return ok({ items: entries.slice(offset, offset + limit), total: entries.length, limit, offset }, env);
}

export async function create(req: Request, env: Env, type: ContentType): Promise<Response> {
  const user = await sessionUser(req, env);
  if (!user) return fail("Unauthorized", env, 401);

  let body: Partial<ContentEntry>;
  try { body = await req.json() as Partial<ContentEntry>; } catch { return fail("Invalid JSON", env, 400); }

  if (!body.title || !body.description || !body.url)
    return fail("title, description and url are required", env, 400);

  const isMod = user.role !== "user";
  const now   = new Date().toISOString();
  const entry: ContentEntry = {
    id: nanoid(), type,
    category:     isMod ? "default" : "user",
    title:        String(body.title).slice(0, 120),
    description:  String(body.description).slice(0, 1000),
    url:          String(body.url),
    imageUrl:     body.imageUrl ? String(body.imageUrl) : undefined,
    tags:         Array.isArray(body.tags) ? (body.tags as string[]).slice(0, 10) : [],
    uploaderUid:  user.uid,
    uploaderName: user.name,
    approved:     isMod,
    createdAt:    now, updatedAt: now,
  };

  await saveEntry(env, entry);
  await addToIndex(env, type, entry.category, entry.id);
  return ok(entry, env, 201);
}

export async function getOne(req: Request, env: Env, id: string): Promise<Response> {
  const entry = await getEntry(env, id);
  if (!entry) return fail("Not found", env, 404);
  const user = await sessionUser(req, env);
  if (!entry.approved && (!user || (user.role === "user" && user.uid !== entry.uploaderUid)))
    return fail("Not found", env, 404);
  return ok(entry, env);
}

export async function update(req: Request, env: Env, id: string): Promise<Response> {
  const user = await sessionUser(req, env);
  if (!user) return fail("Unauthorized", env, 401);
  const entry = await getEntry(env, id);
  if (!entry) return fail("Not found", env, 404);
  if (user.role === "user" && user.uid !== entry.uploaderUid) return fail("Forbidden", env, 403);

  let body: Partial<ContentEntry>;
  try { body = await req.json() as Partial<ContentEntry>; } catch { return fail("Invalid JSON", env, 400); }

  const updated: ContentEntry = { ...entry, updatedAt: new Date().toISOString() };
  const userFields: Array<keyof ContentEntry> = ["title", "description", "url", "imageUrl", "tags"];
  const modFields:  Array<keyof ContentEntry> = [...userFields, "category", "approved"];
  const allowed = user.role !== "user" ? modFields : userFields;

  for (const k of allowed) {
    if (k in body && body[k] !== undefined) {
      (updated as unknown as Record<string, unknown>)[k] = body[k];
    }
  }

  if (updated.category !== entry.category) {
    await removeFromIndex(env, entry.type, entry.category, id);
    await addToIndex(env, entry.type, updated.category, id);
  }

  await saveEntry(env, updated);
  return ok(updated, env);
}

export async function archive(req: Request, env: Env, id: string): Promise<Response> {
  const user = await sessionUser(req, env);
  if (!user || user.role === "user") return fail("Forbidden", env, 403);
  const entry = await getEntry(env, id);
  if (!entry) return fail("Not found", env, 404);
  if (entry.category === "archive") return ok(entry, env);

  await removeFromIndex(env, entry.type, entry.category, id);
  const archived: ContentEntry = { ...entry, category: "archive" as ContentCategory, approved: false, updatedAt: new Date().toISOString() };
  await saveEntry(env, archived);
  await addToIndex(env, entry.type, "archive", id);
  return ok(archived, env);
}

export async function hardDelete(req: Request, env: Env, id: string): Promise<Response> {
  const user = await sessionUser(req, env);
  if (!user || user.role !== "admin") return fail("Forbidden", env, 403);
  const entry = await getEntry(env, id);
  if (!entry) return fail("Not found", env, 404);
  await env.CONTENT.delete(`content:${id}`);
  await removeFromIndex(env, entry.type, entry.category, id);
  return ok({ deleted: true }, env);
}
