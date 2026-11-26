import { useSyncExternalStore } from 'react';
import { getWallpapers, subscribeWallpapers } from '@/shared/lib/clientSettings/wallpaperStore';
import type { ChatWallpaper } from '@/shared/lib/appearance/wallpaper';

const readChats = () => getWallpapers().chats;

export const useChatWallpaperOverride = (chatId?: string | number | null): ChatWallpaper | null => {
  const chats = useSyncExternalStore(subscribeWallpapers, readChats, readChats);
  return chatId === undefined || chatId === null ? null : chats[String(chatId)] ?? null;
};
