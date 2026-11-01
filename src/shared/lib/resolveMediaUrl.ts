import { DEFAULT_AVATAR } from '@/shared/base/ui';

const BASE_URL = String(import.meta.env.VITE_BASE_URL ?? '').replace(/\/+$/, '');
const ABSOLUTE_URL = /^(?:https?:|blob:|data:)/i;

// Resolves a media path returned by the API (relative, e.g. "/static/avatars/a.jpg")
// to a full URL. Absolute URLs are returned unchanged so the base is never prefixed twice.
export const resolveMediaUrl = (path?: string | null, fallback: string = DEFAULT_AVATAR): string => {
  if (!path) return fallback;
  if (ABSOLUTE_URL.test(path)) return path;
  if (path.startsWith('/api/v2/')) return new URL(path, BASE_URL || window.location.origin).href;
  // Bundled defaults live on the frontend, including when used as a group's avatar.
  if (/^\/static\/avatars\/(default\.jpg|group\.png|deleted\.jpg)$/.test(path)) {
    return new URL(path, window.location.origin).href;
  }
  return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};
