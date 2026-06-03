// All requests go to /api — relative, works on any domain
const API = '/api';

function getToken(): string | null {
  return sessionStorage.getItem('auth_token');
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  browse: (type: 'client' | 'mod' | 'skin', params: Record<string, string | number | undefined>) => {
    const endpoint = type === 'client' ? 'clients' : type === 'mod' ? 'mods' : 'skins';
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined) sp.set(k, String(v));
    return request<{ items: unknown[]; total: number; limit: number; offset: number }>(`/${endpoint}?${sp}`);
  },
  getMe: () => request<{ data: unknown }>('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
};
