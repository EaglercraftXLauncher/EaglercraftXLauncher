import { API_ENDPOINTS } from './constants';

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  token?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8788/api';

export async function apiCall<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Auth API
export const authApi = {
  getMe: (token: string) =>
    apiCall('/auth/me', { token }),

  googleAuth: (code: string, redirectUri: string) =>
    apiCall('/auth/google/callback', {
      method: 'POST',
      body: { code, redirectUri },
    }),

  githubAuth: (code: string, redirectUri: string) =>
    apiCall('/auth/github/callback', {
      method: 'POST',
      body: { code, redirectUri },
    }),

  logout: (token: string) =>
    apiCall('/auth/logout', { method: 'POST', token }),
};

// Users API
export const usersApi = {
  getProfile: (userId: string) =>
    apiCall(`/users/${userId}`),

  updateProfile: (userId: string, data: unknown, token: string) =>
    apiCall(`/users/${userId}`, {
      method: 'PUT',
      body: data,
      token,
    }),

  deleteProfile: (userId: string, token: string) =>
    apiCall(`/users/${userId}`, {
      method: 'DELETE',
      token,
    }),
};

// Content API
export const contentApi = {
  getClients: (page = 1, limit = 12) =>
    apiCall(`/content/clients?page=${page}&limit=${limit}`),

  getMods: (page = 1, limit = 12) =>
    apiCall(`/content/mods?page=${page}&limit=${limit}`),

  getSkins: (page = 1, limit = 12) =>
    apiCall(`/content/skins?page=${page}&limit=${limit}`),

  searchContent: (query: string, type: string, page = 1) =>
    apiCall(`/content/search?q=${query}&type=${type}&page=${page}`),

  getContentById: (contentId: string) =>
    apiCall(`/content/${contentId}`),

  uploadContent: (data: unknown, token: string) =>
    apiCall('/content', {
      method: 'POST',
      body: data,
      token,
    }),

  updateContent: (contentId: string, data: unknown, token: string) =>
    apiCall(`/content/${contentId}`, {
      method: 'PUT',
      body: data,
      token,
    }),

  deleteContent: (contentId: string, token: string) =>
    apiCall(`/content/${contentId}`, {
      method: 'DELETE',
      token,
    }),
};

// Stats API
export const statsApi = {
  getStats: () =>
    apiCall('/stats'),

  getUserStats: (userId: string, token: string) =>
    apiCall(`/stats/user/${userId}`, { token }),
};