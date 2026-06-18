export const APP_NAME = import.meta.env.VITE_APP_NAME || 'EaglercraftXLauncher';
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const API_ENDPOINTS = {
  clients: '/clients',
  mods: '/mods',
  skins: '/skins',
  auth: {
    google: '/auth/google',
    github: '/auth/github',
    me: '/auth/me',
  },
  users: '/users',
  content: '/content',
  stats: '/stats',
};

export const PAGINATION = {
  DEFAULT_LIMIT: 12,
  MAX_LIMIT: 100,
};

export const TOAST_DURATION = {
  SHORT: 2000,
  MEDIUM: 3000,
  LONG: 5000,
  PERSISTENT: 0,
};

export const GRAVATAR_SIZE = 200;
export const GRAVATAR_DEFAULT = 'identicon';
