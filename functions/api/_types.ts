export interface Env {
  USERS:         KVNamespace;
  SESSIONS:      KVNamespace;
  CONTENT:       KVNamespace;
  CONTENT_INDEX: KVNamespace;

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
  // Ban/suspend fields
  banned?:       boolean;
  bannedUntil?:  string | null;   // ISO string — null = permanent ban
  banReason?:    string;
}

export interface Session {
  token:     string;
  uid:       string;
  expiresAt: number;
}

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

export interface AdminPass {
  code:      string;
  createdAt: string;
  used:      boolean;
  usedBy?:   string;
  usedAt?:   string;
  label?:    string;
}
