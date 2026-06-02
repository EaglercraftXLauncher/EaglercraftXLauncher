export type ContentType     = "client" | "mod" | "skin";
export type ContentCategory = "default" | "user" | "archive";
export type UserRole        = "user" | "moderator" | "admin";

export interface User {
  uid: string;
  name: string;
  bio: string;
  gravatarEmail: string;
  avatar: string;        // resolved gravatar URL
  role: UserRole;
  providers: string[];
  createdAt: string;
}

export interface ContentEntry {
  id: string;
  type: ContentType;
  category: ContentCategory;
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  tags: string[];
  uploaderUid: string;
  uploaderName: string;
  approved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BrowseResult {
  items: ContentEntry[];
  total: number;
  limit: number;
  offset: number;
}
