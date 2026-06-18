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

export interface IndexEntry {
  contentId:   string;
  kind:        ContentKind;
  name:        string;
  author:      string;
  faviconUrl:  string;
  posterUrl:   string;
  description: string;
  uploaderUid: string;
  createdAt:   string;
  latestTag:   string | null;
}

export interface ContentVersion {
  tag:        string;
  filename:   string;
  label:      string;
  changelog:  string;
  uploadedAt: string;
  isLatest:   boolean;
}

export interface AutoSyncConfig {
  enabled:     boolean;
  sourceUrl:   string;
  versionTag:  string;
  lastSyncAt:  string | null;
  lastSyncOk:  boolean | null;
  lastSyncMsg: string | null;
}

export interface ClientManifest {
  contentId:    string;
  kind:         ContentKind;
  name:         string;
  author:       string;
  description:  string;
  faviconUrl:   string;
  posterUrl:    string;
  bannerUrl:    string;
  tags:         string[];
  uploaderUid:  string;
  createdAt:    string;
  updatedAt:    string;
  versions:     ContentVersion[];
  screenshots:  string[];
  docs:         string[];
  autoSync:     AutoSyncConfig | null;
}
