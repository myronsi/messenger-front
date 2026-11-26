import { useAppearance } from '@/shared/contexts/AppearanceContext';
import { resolveWallpaper } from '@/shared/lib/appearance/wallpaper';
import { useChatWallpaperOverride } from '../model/useChatWallpaper';
import { WallpaperFill } from './WallpaperFill';

export const ChatWallpaperLayer = ({ chatId }: { chatId?: string | number | null }) => {
  const { settings, tone } = useAppearance();
  const override = useChatWallpaperOverride(chatId);
  if (!override && settings.wallpaper.kind === 'builtin') return null;
  return <WallpaperFill wallpaper={resolveWallpaper(override, settings.wallpaper)} tone={tone} className="pointer-events-none absolute inset-0" />;
};
