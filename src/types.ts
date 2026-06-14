export type ContentKind = "client" | "mod" | "skin";
export type UserRole    = "user" | "developer" | "admin" | "owner";

export interface User {
  uid:           string;
  name:          string;
  bio:           string;
  gravatarEmail: string;
  avatar:        string;
  role:          UserRole;
  providers:     string[];
  createdAt:     string;
}

// Matches ContentEntry from functions/api/_github.ts
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

export interface BrowseResult {
  items:  ContentEntry[];
  total:  number;
  limit:  number;
  offset: number;
}
