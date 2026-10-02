import { DEFAULT_AVATAR } from '@/shared/base/ui';

const BASE_URL = String(import.meta.env.VITE_BASE_URL ?? '').replace(/\/+$/, '');
const ABSOLUTE_URL = /^(?:https?:|blob:|data:)/i;

// Resolves a media path returned by the API (relative, e.g. "/static/avatars/a.jpg")
// to a full URL. Absolute URLs are returned unchanged so the base is never prefixed twice.
export const resolveMediaUrl = (path?: string | null, fallback: string = DEFAULT_AVATAR): string => {
  if (!path) return fallback;
  if (ABSOLUTE_URL.test(path)) return path;
  return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};