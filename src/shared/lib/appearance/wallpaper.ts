import type { CSSProperties } from 'react';
import type { ThemeTone } from './palette';

export const CHAT_BACKGROUNDS = ['plain', 'tint', 'gradient', 'dots', 'grid'] as const;
export type ChatBackground = typeof CHAT_BACKGROUNDS[number];

export const WALLPAPER_PATTERNS = ['none', 'dots', 'grid'] as const;
export type WallpaperPattern = typeof WALLPAPER_PATTERNS[number];

export const WALLPAPER_BLUR_MAX = 20;
export const WALLPAPER_DIM_MAX = 60;
export const WALLPAPER_DIM_DARK_DEFAULT = 20;
export const WALLPAPER_MAX_COLORS = 2;

export interface WallpaperPhoto {
  id: string;
  url: string;
  displayUrl?: string;
  thumbnailUrl?: string;
}

export type ChatWallpaper =
  | { kind: 'builtin'; preset: ChatBackground }
  | { kind: 'color'; colors: string[]; pattern: WallpaperPattern }
  | { kind: 'photo'; photo: WallpaperPhoto; blur: number; dim: number | null };

export const DEFAULT_WALLPAPER: ChatWallpaper = { kind: 'builtin', preset: 'plain' };

const HEX = /^#[0-9a-f]{6}$/i;

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const oneOf = <T extends string>(options: readonly T[], value: unknown): value is T => (options as readonly unknown[]).includes(value);
const clampInt = (value: unknown, max: number, fallback: number) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(0, Math.round(number))) : fallback;
};

export const parseColors = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null;
  const colors = value.filter((item): item is string => typeof item === 'string' && HEX.test(item)).slice(0, WALLPAPER_MAX_COLORS);
  return colors.length ? colors.map((color) => color.toLowerCase()) : null;
};

const parsePhoto = (value: unknown): WallpaperPhoto | null => {
  if (!record(value) || typeof value.id !== 'string' || !value.id || typeof value.url !== 'string' || !value.url) return null;
  return {
    id: value.id,
    url: value.url,
    ...(typeof value.displayUrl === 'string' && value.displayUrl ? { displayUrl: value.displayUrl } : {}),
    ...(typeof value.thumbnailUrl === 'string' && value.thumbnailUrl ? { thumbnailUrl: value.thumbnailUrl } : {}),
  };
};

export const parseWallpaper = (value: unknown): ChatWallpaper | null => {
  if (oneOf(CHAT_BACKGROUNDS, value)) return { kind: 'builtin', preset: value };
  if (!record(value)) return null;
  if (value.kind === 'builtin') return oneOf(CHAT_BACKGROUNDS, value.preset) ? { kind: 'builtin', preset: value.preset } : null;
  if (value.kind === 'color') {
    const colors = parseColors(value.colors);
    if (!colors) return null;
    return { kind: 'color', colors, pattern: oneOf(WALLPAPER_PATTERNS, value.pattern) ? value.pattern : 'none' };
  }
  if (value.kind === 'photo') {
    const photo = parsePhoto(value.photo);
    if (!photo) return null;
    const dim = value.dim === null || value.dim === undefined ? null : clampInt(value.dim, WALLPAPER_DIM_MAX, 0);
    return { kind: 'photo', photo, blur: clampInt(value.blur, WALLPAPER_BLUR_MAX, 0), dim };
  }
  return null;
};

export const sameWallpaper = (a: ChatWallpaper | null | undefined, b: ChatWallpaper | null | undefined) => {
  if (!a || !b) return a === b;
  if (a.kind === 'builtin' && b.kind === 'builtin') return a.preset === b.preset;
  if (a.kind === 'color' && b.kind === 'color') return a.pattern === b.pattern && a.colors.join() === b.colors.join();
  if (a.kind === 'photo' && b.kind === 'photo') return a.photo.id === b.photo.id && a.blur === b.blur && a.dim === b.dim;
  return false;
};

export const resolveWallpaper = (chat: ChatWallpaper | null | undefined, fallback: ChatWallpaper | null | undefined): ChatWallpaper => (
  chat ?? fallback ?? DEFAULT_WALLPAPER
);

export const wallpaperDim = (wallpaper: Extract<ChatWallpaper, { kind: 'photo' }>, tone: ThemeTone) => (
  wallpaper.dim ?? (tone === 'dark' ? WALLPAPER_DIM_DARK_DEFAULT : 0)
);

export const colorFill = (colors: string[]): CSSProperties => (
  colors.length > 1 ? { backgroundImage: `linear-gradient(160deg, ${colors[0]} 0%, ${colors[1]} 100%)` } : { backgroundColor: colors[0] }
);

const PATTERN_FILL: Record<Exclude<WallpaperPattern, 'none'>, CSSProperties> = {
  dots: { backgroundImage: 'radial-gradient(rgb(255 255 255 / 0.28) 1px, transparent 1.6px)', backgroundSize: '18px 18px' },
  grid: {
    backgroundImage: 'linear-gradient(rgb(255 255 255 / 0.16) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.16) 1px, transparent 1px)',
    backgroundSize: '24px 24px',
  },
};

export const patternFill = (pattern: WallpaperPattern): CSSProperties | null => (pattern === 'none' ? null : PATTERN_FILL[pattern]);

export const WALLPAPERS_STORAGE_KEY = 'messenger:wallpapers';

export interface WallpaperCache {
  fallback: ChatWallpaper | null;
  chats: Record<string, ChatWallpaper>;
}

export const parseWallpaperCache = (raw: string | null): WallpaperCache => {
  try {
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (!record(value)) return { fallback: null, chats: {} };
    const chats: Record<string, ChatWallpaper> = {};
    if (record(value.chats)) {
      Object.entries(value.chats).forEach(([chatId, item]) => {
        const wallpaper = parseWallpaper(item);
        if (wallpaper) chats[chatId] = wallpaper;
      });
    }
    return { fallback: parseWallpaper(value.fallback), chats };
  } catch {
    return { fallback: null, chats: {} };
  }
};

export const loadWallpaperCache = (): WallpaperCache => {
  try {
    return parseWallpaperCache(localStorage.getItem(WALLPAPERS_STORAGE_KEY));
  } catch {
    return { fallback: null, chats: {} };
  }
};

export const saveWallpaperCache = (cache: WallpaperCache) => {
  try {
    localStorage.setItem(WALLPAPERS_STORAGE_KEY, JSON.stringify(cache));
  } catch {
    return;
  }
};
