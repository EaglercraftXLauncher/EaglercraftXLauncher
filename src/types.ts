export type ContentKind = "client" | "mod" | "skin";
export type UserRole = "user" | "developer" | "admin" | "owner";

export interface User {
  uid: string;
  name: string;
  bio: string;
  gravatarEmail: string;
  avatar: string;
  role: UserRole;
  providers: string[];
  createdAt: string;
}

export interface ContentEntry {
  contentId: string;
  kind: ContentKind;
  name: string;
  author: string;
  description: string;
  faviconUrl?: string;
  posterUrl?: string;
  tags?: string[];
  uploaderUid: string;
  createdAt: string;
  updatedAt?: string;
  latestTag?: string | null;
  downloadCount?: number;
  forgeReady?: boolean;
  mcVersion?: "1.8" | "1.12";
}

export interface IndexEntry extends ContentEntry {}

export interface ContentVersion {
  tag: string;
  filename: string;
  label: string;
  changelog: string;
  uploadedAt: string;
  isLatest: boolean;
  mcVersion?: "1.8" | "1.12";
}

export interface AutoSyncConfig {
  enabled: boolean;
  sourceUrl: string;
  versionTag: string;
  lastSyncAt: string | null;
  lastSyncOk: boolean | null;
  lastSyncMsg: string | null;
}

export interface ClientManifest {
  contentId: string;
  kind: ContentKind;
  name: string;
  author: string;
  description: string;
  faviconUrl: string;
  posterUrl: string;
  bannerUrl?: string;
  tags: string[];
  uploaderUid: string;
  createdAt: string;
  updatedAt: string;
  versions: ContentVersion[];
  screenshots: string[];
  docs: string[];
  autoSync: AutoSyncConfig | null;
  autoSyncs?: AutoSyncConfig[];
  forgeReady?: boolean;
  mcVersion?: "1.8" | "1.12";
}
