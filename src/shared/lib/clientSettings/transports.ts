import { apiClient } from '@/shared/api/client';
import { contractData } from '@/shared/api/tasks';
import type { ClientSettingsTransport } from './clientSettingsStore';
import type { WallpaperTransport } from './wallpaperStore';
import { settingsFromWire, settingsPatchToWire, wallpaperFromWire, wallpapersFromWire, wallpaperToWire } from './wireFormat';

const stored = (value: ReturnType<typeof wallpaperFromWire>) => {
  if (!value) throw new Error('The server returned an unknown background');
  return value;
};

export const clientSettingsTransport: ClientSettingsTransport = {
  load: async () => settingsFromWire(contractData(await apiClient.GET('/me/client-settings'))),
  save: async (patch) => settingsFromWire(contractData(await apiClient.PATCH('/me/client-settings', { body: settingsPatchToWire(patch) }))),
};

export const wallpaperTransport: WallpaperTransport = {
  load: async () => wallpapersFromWire(contractData(await apiClient.GET('/me/wallpapers')).items),
  setDefault: async (wallpaper) => stored(wallpaperFromWire(
    contractData(await apiClient.PUT('/me/wallpapers/default', { body: wallpaperToWire(wallpaper) })).wallpaper,
  )),
  clearDefault: async () => { contractData(await apiClient.DELETE('/me/wallpapers/default')); },
  setChat: async (chatId, wallpaper, forBoth) => stored(wallpaperFromWire(contractData(await apiClient.PUT('/chats/{chat_id}/wallpaper', {
    params: { path: { chat_id: chatId } },
    body: { ...wallpaperToWire(wallpaper), for_both: forBoth },
  })).wallpaper)),
  clearChat: async (chatId) => { contractData(await apiClient.DELETE('/chats/{chat_id}/wallpaper', { params: { path: { chat_id: chatId } } })); },
};
