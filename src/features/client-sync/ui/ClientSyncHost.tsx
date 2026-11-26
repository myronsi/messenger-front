import { useEffect } from 'react';
import { adoptLegacyReactionUsage, migrateLocalPlaylists, playlistsApi, summaryFromWire } from '@/entities/message';
import { realtime } from '@/shared/api/realtime';
import { getAccessToken } from '@/shared/auth/session';
import { getTokenSubject } from '@/shared/auth/tokenClaims';
import { useAppDispatch } from '@/shared/hooks/redux';
import {
  applyRemoteClientSettings, startClientSettingsSync, stopClientSettingsSync,
} from '@/shared/lib/clientSettings/clientSettingsStore';
import { clientSettingsTransport, wallpaperTransport } from '@/shared/lib/clientSettings/transports';
import { applyWallpaperEvent, startWallpaperSync, stopWallpaperSync } from '@/shared/lib/clientSettings/wallpaperStore';
import { settingsFromWire, wallpaperFromWire } from '@/shared/lib/clientSettings/wireFormat';
import { parseSyncEvent } from '../model/syncEvents';

export const ClientSyncHost = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const userId = getTokenSubject(getAccessToken());
    if (!userId) return undefined;
    const start = () => {
      void startClientSettingsSync(userId, clientSettingsTransport);
      void startWallpaperSync(userId, wallpaperTransport);
    };
    adoptLegacyReactionUsage(userId);
    start();
    void migrateLocalPlaylists().then((uploaded) => {
      if (uploaded) dispatch(playlistsApi.util.invalidateTags([{ type: 'Playlist', id: 'LIST' }]));
    }).catch(() => undefined);
    const release = realtime.subscribe({
      onOpen: ({ reconnected }) => {
        if (!reconnected) return;
        start();
        dispatch(playlistsApi.util.invalidateTags(['Playlist']));
      },
      onEvent: (raw) => {
        const event = parseSyncEvent(raw);
        if (!event) return;
        if (event.type === 'client_settings_updated') {
          applyRemoteClientSettings(settingsFromWire(event.data));
        } else if (event.type === 'wallpaper_updated') {
          applyWallpaperEvent(event.data.chat_id === null ? null : String(event.data.chat_id), wallpaperFromWire(event.data.entry?.wallpaper));
        } else {
          const { action, playlist_id: id, playlist } = event.data;
          dispatch(playlistsApi.util.updateQueryData('listPlaylists', undefined, (draft) => {
            const index = draft.findIndex((item) => item.id === id);
            if (action === 'deleted' || !playlist) {
              if (index !== -1) draft.splice(index, 1);
            } else if (index === -1) draft.unshift(summaryFromWire(playlist));
            else draft[index] = summaryFromWire(playlist);
          }));
          dispatch((_, getState) => {
            const state = getState() as Parameters<ReturnType<typeof playlistsApi.endpoints.getPlaylist.select>>[0];
            const cached = playlistsApi.endpoints.getPlaylist.select(id)(state).data;
            if (cached && (action === 'deleted' || !playlist || playlist.version > cached.version)) {
              dispatch(playlistsApi.util.invalidateTags([{ type: 'Playlist', id }]));
            }
          });
        }
      },
    });
    return () => {
      release();
      stopClientSettingsSync();
      stopWallpaperSync();
    };
  }, [dispatch]);

  return null;
};
