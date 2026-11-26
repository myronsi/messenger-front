import { onAccountCleared } from '@/shared/auth/accountStorage';
import { APPEARANCE_STORAGE_KEY, parseLocalAppearance } from '@/shared/lib/appearance/settings';
import {
  WALLPAPERS_STORAGE_KEY, loadWallpaperCache, sameWallpaper, saveWallpaperCache, type ChatWallpaper, type WallpaperCache,
} from '@/shared/lib/appearance/wallpaper';

export const WALLPAPERS_SYNCED_KEY = 'messenger:client-settings:wallpapers-synced';
export const DEFAULT_WALLPAPER_DEBOUNCE_MS = 600;

export interface WallpaperTransport {
  load: () => Promise<WallpaperCache>;
  setDefault: (wallpaper: ChatWallpaper) => Promise<ChatWallpaper>;
  clearDefault: () => Promise<void>;
  setChat: (chatId: string, wallpaper: ChatWallpaper, forBoth: boolean) => Promise<ChatWallpaper>;
  clearChat: (chatId: string) => Promise<void>;
}

export interface WallpaperState extends WallpaperCache {
  ready: boolean;
}

const legacyFallback = (): ChatWallpaper | null => {
  try {
    return parseLocalAppearance(localStorage.getItem(APPEARANCE_STORAGE_KEY)).wallpaper ?? null;
  } catch {
    return null;
  }
};

const hasWallpaperCache = () => {
  try {
    return localStorage.getItem(WALLPAPERS_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
};

const initialState = (): WallpaperState => {
  const cache = loadWallpaperCache();
  const hasCache = hasWallpaperCache();
  return { fallback: hasCache ? cache.fallback : legacyFallback(), chats: cache.chats, ready: false };
};

let state: WallpaperState = initialState();
let transport: WallpaperTransport | null = null;
let session = 0;
let defaultTimer: ReturnType<typeof setTimeout> | undefined;
let defaultPending: { value: ChatWallpaper | null } | null = null;
const listeners = new Set<() => void>();

const isPlain = (wallpaper: ChatWallpaper | null) => !wallpaper || (wallpaper.kind === 'builtin' && wallpaper.preset === 'plain');

const setState = (next: WallpaperState) => {
  state = next;
  saveWallpaperCache({ fallback: next.fallback, chats: next.chats });
  listeners.forEach((listener) => listener());
};

const withChat = (chatId: string, wallpaper: ChatWallpaper | null): WallpaperState => {
  const chats = { ...state.chats };
  if (wallpaper) chats[chatId] = wallpaper;
  else delete chats[chatId];
  return { ...state, chats };
};

const reload = async () => {
  if (!transport) return;
  const current = session;
  try {
    const fresh = await transport.load();
    if (current === session) setState({ ...fresh, ...(defaultPending ? { fallback: defaultPending.value } : {}), ready: true });
  } catch {
    return;
  }
};

const flushDefault = async () => {
  defaultTimer = undefined;
  if (!transport || !defaultPending) return;
  const current = session;
  const { value } = defaultPending;
  defaultPending = null;
  try {
    if (isPlain(value)) await transport.clearDefault();
    else if (value) {
      const stored = await transport.setDefault(value);
      if (current === session && !defaultPending) setState({ ...state, fallback: stored });
    }
  } catch {
    if (current === session && !defaultPending) await reload();
  }
};

export const setDefaultWallpaper = (wallpaper: ChatWallpaper | null, delay = DEFAULT_WALLPAPER_DEBOUNCE_MS) => {
  const value = isPlain(wallpaper) ? null : wallpaper;
  if (sameWallpaper(value, state.fallback) && !defaultPending) return;
  setState({ ...state, fallback: value });
  defaultPending = { value };
  if (defaultTimer) clearTimeout(defaultTimer);
  defaultTimer = setTimeout(() => { void flushDefault(); }, delay);
};

export const setChatWallpaper = async (chatId: string, wallpaper: ChatWallpaper | null, forBoth = false) => {
  if (!transport) throw new Error('Wallpaper sync is not running');
  if (wallpaper) {
    const stored = await transport.setChat(chatId, wallpaper, forBoth);
    setState(withChat(chatId, stored));
    return;
  }
  await transport.clearChat(chatId);
  setState(withChat(chatId, null));
};

export const applyWallpaperEvent = (chatId: string | null, wallpaper: ChatWallpaper | null) => {
  if (chatId === null) {
    if (defaultPending) return;
    setState({ ...state, fallback: wallpaper });
    return;
  }
  setState(withChat(chatId, wallpaper));
};

const readSynced = (): string[] => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(WALLPAPERS_SYNCED_KEY) || '[]');
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
};

const writeSynced = (ids: string[]) => {
  try {
    localStorage.setItem(WALLPAPERS_SYNCED_KEY, JSON.stringify(ids));
  } catch {
    return;
  }
};

export const startWallpaperSync = async (userId: string, next: WallpaperTransport) => {
  stopWallpaperSync();
  transport = next;
  const current = ++session;
  let fresh: WallpaperCache;
  try {
    fresh = await next.load();
  } catch {
    return;
  }
  if (current !== session) return;
  const synced = readSynced();
  const local = state.fallback;
  writeSynced([userId, ...synced.filter((id) => id !== userId)].slice(0, 50));
  setState({ ...fresh, ready: true });
  if (!synced.includes(userId) && !fresh.fallback && !isPlain(local)) setDefaultWallpaper(local, 0);
};

export function stopWallpaperSync() {
  session += 1;
  transport = null;
  if (defaultTimer) clearTimeout(defaultTimer);
  defaultTimer = undefined;
  defaultPending = null;
  if (state.ready) {
    state = { ...state, ready: false };
    listeners.forEach((listener) => listener());
  }
}

export const getWallpapers = () => state;

export const subscribeWallpapers = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const reloadWallpaperCache = () => {
  state = { ...initialState(), ready: state.ready };
  listeners.forEach((listener) => listener());
};

export const resetWallpapersForTests = () => {
  stopWallpaperSync();
  state = initialState();
};

onAccountCleared(() => {
  stopWallpaperSync();
  state = initialState();
  listeners.forEach((listener) => listener());
});
