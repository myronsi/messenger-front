import { useContext } from 'react';
import { AppearanceContext } from '@/shared/contexts/AppearanceContext';
import { resolveWallpaper } from '@/shared/lib/appearance/wallpaper';
import { useChatWallpaperOverride } from '../model/useChatWallpaper';
import { WallpaperFill } from './WallpaperFill';

export const ChatWallpaperLayer = ({ chatId }: { chatId?: string | number | null }) => {
  const appearance = useContext(AppearanceContext);
  const override = useChatWallpaperOverride(chatId);
  if (!appearance || (!override && appearance.settings.wallpaper.kind === 'builtin')) return null;
  return (
    <WallpaperFill wallpaper={resolveWallpaper(override, appearance.settings.wallpaper)} tone={appearance.tone}
      className="pointer-events-none absolute inset-0" />
  );
};
