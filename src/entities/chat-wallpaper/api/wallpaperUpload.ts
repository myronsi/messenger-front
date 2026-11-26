import { apiUrl } from '@/shared/api/config';
import type { components } from '@/shared/api/generated/schema';
import { uploadWithProgress } from '@/shared/api/uploadWithProgress';
import type { WallpaperPhoto } from '@/shared/lib/appearance/wallpaper';
import { photoFromAttachment } from '../model/photo';

export const uploadWallpaperPhoto = async (file: Blob, onProgress?: (percent: number) => void): Promise<WallpaperPhoto> => {
  const form = new FormData();
  form.set('file', file);
  form.set('purpose', 'chat_wallpaper');
  const attachment = await uploadWithProgress<components['schemas']['Attachment']>({ url: apiUrl('/attachments'), formData: form, onProgress });
  return photoFromAttachment(attachment);
};
