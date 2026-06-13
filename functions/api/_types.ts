export interface Env {
  USERS:         KVNamespace;
  SESSIONS:      KVNamespace;

  GOOGLE_CLIENT_ID:     string;
  GOOGLE_CLIENT_SECRET: string;
  GITHUB_CLIENT_ID:     string;
  GITHUB_CLIENT_SECRET: string;
  SESSION_SECRET:       string;
  SITE_URL:             string;
  OWNER_PASSWORD:       string;
  DEV_QUESTION_1:       string;
  DEV_QUESTION_2:       string;
  DEV_QUESTION_3:       string;

  // GitHub CDN repo (separate from auth repo)
  GITHUB_PAT:       string;   // PAT with repo scope for CDN repo
  CDN_REPO_OWNER:   string;   // e.g. "EaglercraftXLauncher"
  CDN_REPO_NAME:    string;   // e.g. "EaglercraftXLauncherCDN"
}

export interface User {
  uid:           string;
  email:         string;
  name:          string;
  bio:           string;
  gravatarEmail: string;
  role:          "user" | "developer" | "admin" | "owner";
  providers:     Array<"google" | "github">;
  providerIds:   Record<string, string>;
  createdAt:     string;
  updatedAt:     string;
  banned?:       boolean;
  bannedUntil?:  string | null;
  banReason?:    string;
}

export interface Session {
  token:     string;
  uid:       string;
  expiresAt: number;
}

export interface AdminPass {
  code:      string;
  createdAt: string;
  used:      boolean;
  usedBy?:   string;
  usedAt?:   string;
  label?:    string;
}
