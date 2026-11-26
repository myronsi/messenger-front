import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APPEARANCE_STORAGE_KEY } from '@/shared/lib/appearance/settings';
import { WALLPAPERS_STORAGE_KEY, type ChatWallpaper } from '@/shared/lib/appearance/wallpaper';
import {
  DEFAULT_WALLPAPER_DEBOUNCE_MS, applyWallpaperEvent, getWallpapers, resetWallpapersForTests, setChatWallpaper, setDefaultWallpaper,
  startWallpaperSync, type WallpaperTransport,
} from './wallpaperStore';

const color: ChatWallpaper = { kind: 'color', colors: ['#112233', '#445566'], pattern: 'dots' };
const photo: ChatWallpaper = { kind: 'photo', photo: { id: 'a1', url: '/api/v2/attachments/a1/content' }, blur: 4, dim: 30 };

const transport = (fallback: ChatWallpaper | null = null, chats: Record<string, ChatWallpaper> = {}) => ({
  load: vi.fn<WallpaperTransport['load']>(async () => ({ fallback, chats })),
  setDefault: vi.fn<WallpaperTransport['setDefault']>(async (wallpaper) => wallpaper),
  clearDefault: vi.fn<WallpaperTransport['clearDefault']>(async () => undefined),
  setChat: vi.fn<WallpaperTransport['setChat']>(async (_chatId, wallpaper) => wallpaper),
  clearChat: vi.fn<WallpaperTransport['clearChat']>(async () => undefined),
});

beforeEach(() => {
  localStorage.clear();
  resetWallpapersForTests();
});

afterEach(() => {
  resetWallpapersForTests();
  vi.useRealTimers();
});

describe('wallpaper sync', () => {
  it('loads the default and the per-chat backgrounds and caches them', async () => {
    const api = transport(color, { 42: photo });
    await startWallpaperSync('1', api);
    expect(getWallpapers()).toMatchObject({ fallback: color, chats: { 42: photo }, ready: true });
    expect(JSON.parse(localStorage.getItem(WALLPAPERS_STORAGE_KEY) ?? '{}').chats['42'].kind).toBe('photo');
  });

  it('uploads the old local built-in background once when the server has no default', async () => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify({ chatBackground: 'dots' }));
    resetWallpapersForTests();
    vi.useFakeTimers();
    const api = transport();
    await startWallpaperSync('1', api);
    await vi.runAllTimersAsync();
    expect(api.setDefault).toHaveBeenCalledWith({ kind: 'builtin', preset: 'dots' });
  });

  it('debounces default changes and clears the default for plain', async () => {
    const api = transport(color);
    await startWallpaperSync('1', api);
    vi.useFakeTimers();
    setDefaultWallpaper({ ...photo, blur: 1 });
    setDefaultWallpaper({ ...photo, blur: 8 });
    expect(getWallpapers().fallback).toMatchObject({ blur: 8 });
    await vi.advanceTimersByTimeAsync(DEFAULT_WALLPAPER_DEBOUNCE_MS);
    expect(api.setDefault).toHaveBeenCalledTimes(1);
    expect(api.setDefault).toHaveBeenCalledWith({ ...photo, blur: 8 });
    setDefaultWallpaper({ kind: 'builtin', preset: 'plain' });
    await vi.advanceTimersByTimeAsync(DEFAULT_WALLPAPER_DEBOUNCE_MS);
    expect(api.clearDefault).toHaveBeenCalledTimes(1);
    expect(getWallpapers().fallback).toBeNull();
  });

  it('sets a chat background for both people and resets it', async () => {
    const api = transport();
    await startWallpaperSync('1', api);
    await setChatWallpaper('42', color, true);
    expect(api.setChat).toHaveBeenCalledWith('42', color, true);
    expect(getWallpapers().chats['42']).toEqual(color);
    await setChatWallpaper('42', null);
    expect(api.clearChat).toHaveBeenCalledWith('42');
    expect(getWallpapers().chats['42']).toBeUndefined();
  });

  it('applies live updates for the default and for one chat', async () => {
    await startWallpaperSync('1', transport());
    applyWallpaperEvent('42', photo);
    applyWallpaperEvent(null, color);
    expect(getWallpapers()).toMatchObject({ fallback: color, chats: { 42: photo } });
    applyWallpaperEvent('42', null);
    expect(getWallpapers().chats).toEqual({});
  });
});
