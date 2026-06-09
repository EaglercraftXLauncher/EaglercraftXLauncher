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

  // New role-system variables
  OWNER_PASSWORD:       string;   // secret env var — entering this in search box → owner
  DEV_QUESTION_1:       string;   // correct answer to dev question 1
  DEV_QUESTION_2:       string;   // correct answer to dev question 2
  DEV_QUESTION_3:       string;   // correct answer to dev question 3
}

export interface User {
  uid:           string;
  email:         string;
  name:          string;
  bio:           string;
  gravatarEmail: string;
  // "user" | "developer" | "admin" | "owner"
  role:          "user" | "developer" | "admin" | "owner";
  providers:     Array<"google" | "github">;
  providerIds:   Record<string, string>;
  createdAt:     string;
  updatedAt:     string;
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

// Admin pass stored in KV under adminpass:<code>
export interface AdminPass {
  code:       string;
  createdAt:  string;
  used:       boolean;
  usedBy?:    string; // uid
  usedAt?:    string;
  label?:     string; // optional label set by owner
}
