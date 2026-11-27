import { apiClient } from '@/shared/api/client';
import { getApiBaseUrl } from '@/shared/api/config';
import type { components } from '@/shared/api/generated/schema';
import { contractQuery } from '@/shared/api/queryResult';
import { UploadError, uploadWithProgress } from '@/shared/api/uploadWithProgress';
import { tgsToGif } from '../lib/tgsToGif';
import { extensionOf } from '../parsers/common';
import type { StickerCalls } from '../model/importStickers';
import { errorStatus } from '../model/importErrors';

const REFUSED = new Set([409, 413, 415, 422]);

const refused = (status: unknown) => typeof status === 'number' && REFUSED.has(status);

export const importStickerCalls: StickerCalls = {
  upload: async (file, attachment, signal) => {
    const extension = extensionOf(attachment.path);
    const source = extension === 'tgs' ? await tgsToGif(file) : file;
    if (!source) return null;
    const form = new FormData();
    form.set('file', source, extension === 'tgs' ? 'sticker.gif' : attachment.name);
    form.set('purpose', 'sticker');
    form.set('kind', extension === 'webm' ? 'video' : 'image');
    try {
      const url = `${String(getApiBaseUrl()).replace(/\/$/, '')}/attachments`;
      return (await uploadWithProgress<components['schemas']['Attachment']>({ url, formData: form, signal })).id;
    } catch (error) {
      if (error instanceof UploadError && refused(error.status)) return null;
      throw error;
    }
  },
  createPack: async (title) => {
    const result = await contractQuery(() => apiClient.POST('/stickers/packs', { body: { title } }));
    if (!result.error) return result.data.id;
    if (refused(errorStatus(result.error))) return null;
    throw result.error;
  },
  addSticker: async (packId, imageId, emoji) => {
    const result = await contractQuery(() => apiClient.POST('/stickers/packs/{pack_id}/stickers', {
      params: { path: { pack_id: String(packId) } }, body: { attachment_id: String(imageId), emoji },
    }));
    if (!result.error) return result.data.id;
    const status = errorStatus(result.error);
    if (status === 409) return 'full';
    if (refused(status)) return null;
    throw result.error;
  },
};
