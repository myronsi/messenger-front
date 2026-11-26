import type { components } from '@/shared/api/generated/schema';
import type { WallpaperPhoto } from '@/shared/lib/appearance/wallpaper';

type Attachment = components['schemas']['Attachment'];

export const WALLPAPER_MAX_BYTES = 10 * 1024 * 1024;
export const WALLPAPER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const photoFromAttachment = (attachment: Pick<Attachment, 'id' | 'url' | 'display_url' | 'thumbnail_url'>): WallpaperPhoto => ({
  id: String(attachment.id),
  url: attachment.url,
  ...(attachment.display_url ? { displayUrl: attachment.display_url } : {}),
  ...(attachment.thumbnail_url ? { thumbnailUrl: attachment.thumbnail_url } : {}),
});

export type WallpaperFileProblem = 'type' | 'size';

export const wallpaperFileProblem = (file: Pick<File, 'type' | 'size'>): WallpaperFileProblem | null => {
  if (!WALLPAPER_TYPES.includes(file.type)) return 'type';
  if (file.size > WALLPAPER_MAX_BYTES) return 'size';
  return null;
};
