import { makeStickerFrom } from '@/entities/sticker';
import { isGoApi } from '@/shared/api/goSocket';
import type { MessageAttachment } from './types';

export const VIDEO_STICKER_MAX_BYTES = 15 * 1024 * 1024;

type StickerCandidate = Pick<MessageAttachment, 'file_type' | 'file_size' | 'file_url' | 'file_name'>;

export const stickerSourceOf = (item: StickerCandidate) => {
  const type = item.file_type || '';
  const fits = type.startsWith('image/') || (type.startsWith('video/') && item.file_size <= VIDEO_STICKER_MAX_BYTES);
  return fits && item.file_url ? item.file_url : null;
};

export const makeStickerAction = (item: StickerCandidate) => {
  const source = isGoApi() ? stickerSourceOf(item) : null;
  return source ? () => makeStickerFrom(source, item.file_name) : undefined;
};
