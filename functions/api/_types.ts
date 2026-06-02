// Cloudflare Pages Functions expose bindings via context.env
export interface Env {
  // KV namespaces (bound in wrangler.toml)
  USERS:         KVNamespace;
  SESSIONS:      KVNamespace;
  CONTENT:       KVNamespace;
  CONTENT_INDEX: KVNamespace;

  // Secrets (set via `wrangler pages secret put`)
  GOOGLE_CLIENT_ID:     string;
  GOOGLE_CLIENT_SECRET: string;
  GITHUB_CLIENT_ID:     string;
  GITHUB_CLIENT_SECRET: string;
  SESSION_SECRET:       string;

  // Vars (wrangler.toml [vars] or Pages dashboard)
  SITE_URL: string; // e.g. https://eaglercraft-hub.pages.dev
}

// ── User ──────────────────────────────────────────────────────
export interface User {
  uid:          string;
  email:        string;
  name:         string;
  bio:          string;
  gravatarEmail:string;
  role:         "user" | "moderator" | "admin";
  providers:    Array<"google" | "github">;
  providerIds:  Record<string, string>;
  createdAt:    string;
  updatedAt:    string;
}

// ── Session ───────────────────────────────────────────────────
export interface Session {
  token:     string;
  uid:       string;
  expiresAt: number; // unix ms
}

// ── Content ───────────────────────────────────────────────────
export type ContentType     = "client" | "mod" | "skin";
export type ContentCategory = "default" | "user" | "archive";

export interface ContentEntry {
  id:           string;
  type:         ContentType;
  category:     ContentCategory;
  title:        string;
  description:  string;
  url:          string;
  imageUrl?:    string;
  tags:         string[];
  uploaderUid:  string;
  uploaderName: string;
  approved:     boolean;
  createdAt:    string;
  updatedAt:    string;
}
