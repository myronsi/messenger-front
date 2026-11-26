import type { components } from '@/shared/api/generated/schema';
import { DEFAULT_SYNCED_APPEARANCE, parseAppearancePatch, syncedPart, type SyncedAppearance } from '@/shared/lib/appearance/settings';
import {
  CHAT_BACKGROUNDS, WALLPAPER_PATTERNS, parseColors, parseWallpaper, type ChatBackground, type ChatWallpaper, type WallpaperCache,
  type WallpaperPattern,
} from '@/shared/lib/appearance/wallpaper';
import { cleanList, RECENT_EMOJI_MAX, RECENT_REACTIONS_MAX, type ClientSettingsPatch, type ClientSettingsSnapshot } from './clientSettingsStore';

type Schema = components['schemas'];
export type WireClientSettings = Schema['ClientSettings'];
export type WireWallpaper = Schema['Wallpaper'];
export type WireWallpaperEntry = Schema['WallpaperEntry'];
export type WireSetWallpaper = Schema['SetWallpaperRequest'];

export const appearanceFromWire = (value: WireClientSettings['appearance']): SyncedAppearance | null => {
  if (!value) return null;
  return syncedPart({
    ...DEFAULT_SYNCED_APPEARANCE,
    ...parseAppearancePatch({ accent: value.accent, fontSize: value.font_size, density: value.density, corners: value.corners }),
  });
};

export const appearanceToWire = (value: SyncedAppearance): Schema['AppearanceSettings'] => ({
  accent: value.accent, font_size: value.fontSize, density: value.density, corners: value.corners,
});

export const settingsFromWire = (value: WireClientSettings): ClientSettingsSnapshot => ({
  appearance: appearanceFromWire(value.appearance),
  recentEmoji: cleanList(value.recent_emoji, RECENT_EMOJI_MAX),
  recentReactions: cleanList(value.recent_reactions, RECENT_REACTIONS_MAX),
  version: value.version,
});

export const settingsPatchToWire = (patch: ClientSettingsPatch): Schema['UpdateClientSettingsRequest'] => ({
  ...(patch.appearance ? { appearance: appearanceToWire(patch.appearance) } : {}),
  ...(patch.recentEmoji ? { recent_emoji: patch.recentEmoji } : {}),
  ...(patch.recentReactions ? { recent_reactions: patch.recentReactions } : {}),
});

const isBuiltin = (value: unknown): value is ChatBackground => (CHAT_BACKGROUNDS as readonly unknown[]).includes(value);

export const wallpaperFromWire = (value: WireWallpaper | null | undefined): ChatWallpaper | null => {
  if (!value) return null;
  if (value.kind === 'preset') return { kind: 'builtin', preset: isBuiltin(value.preset) ? value.preset : 'plain' };
  if (value.kind === 'color') {
    const colors = parseColors(value.colors);
    if (!colors) return null;
    const pattern: WallpaperPattern = (WALLPAPER_PATTERNS as readonly unknown[]).includes(value.pattern) ? value.pattern as WallpaperPattern : 'none';
    return { kind: 'color', colors, pattern };
  }
  if (!value.attachment) return null;
  return parseWallpaper({
    kind: 'photo',
    photo: {
      id: String(value.attachment.id),
      url: value.attachment.url,
      displayUrl: value.attachment.display_url ?? undefined,
      thumbnailUrl: value.attachment.thumbnail_url ?? undefined,
    },
    blur: value.blur ?? 0,
    dim: value.dim ?? null,
  });
};

export const wallpaperToWire = (value: ChatWallpaper): WireSetWallpaper => {
  if (value.kind === 'builtin') return { kind: 'preset', preset: value.preset };
  if (value.kind === 'color') return { kind: 'color', colors: value.colors, pattern: value.pattern };
  return { kind: 'media', attachment_id: value.photo.id, blur: value.blur, ...(value.dim === null ? {} : { dim: value.dim }) };
};

export const wallpapersFromWire = (entries: WireWallpaperEntry[]): WallpaperCache => {
  const cache: WallpaperCache = { fallback: null, chats: {} };
  entries.forEach((entry) => {
    const wallpaper = wallpaperFromWire(entry.wallpaper);
    if (!wallpaper) return;
    if (entry.chat_id === null) cache.fallback = wallpaper;
    else cache.chats[String(entry.chat_id)] = wallpaper;
  });
  return cache;
};
