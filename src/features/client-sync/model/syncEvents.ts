import type { components } from '@/shared/api/generated/schema';

type Schema = components['schemas'];

export type SyncEvent =
  | { type: 'client_settings_updated'; data: Schema['ClientSettings'] }
  | { type: 'wallpaper_updated'; data: { chat_id: string | null; entry: Schema['WallpaperEntry'] | null } }
  | { type: 'playlists_updated'; data: { action: 'created' | 'updated' | 'deleted'; playlist_id: string; playlist: Schema['PlaylistSummary'] | null } };

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

export const parseSyncEvent = (event: unknown): SyncEvent | null => {
  if (!record(event) || !record(event.data)) return null;
  const { type, data } = event;
  if (type === 'client_settings_updated') return typeof data.version === 'number' ? event as SyncEvent : null;
  if (type === 'wallpaper_updated') return data.chat_id === null || typeof data.chat_id === 'string' ? event as SyncEvent : null;
  if (type === 'playlists_updated') {
    return typeof data.playlist_id === 'string' && ['created', 'updated', 'deleted'].includes(String(data.action)) ? event as SyncEvent : null;
  }
  return null;
};
