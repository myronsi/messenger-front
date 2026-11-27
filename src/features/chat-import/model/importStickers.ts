import type { EntityId } from '@/shared/api/entityId';
import type { ParsedAttachment } from './types';

export const STICKER_KEY = 'sticker:';
export const FILE_HASH_KEY = 'sha256:';
export const STICKER_HASH_KEY = 'sticker-sha256:';
export const PACK_KEY = 'pack:current';
export const PACK_COUNT_KEY = 'pack:count';
export const DEFAULT_STICKER_EMOJI = '🙂';
export const MAX_HASHED_BYTES = 32 * 1024 * 1024;
const PACK_TITLE_LENGTH = 64;

export type AddedSticker = EntityId | 'full' | null;

export interface StickerCalls {
  upload: (file: File, attachment: ParsedAttachment, signal?: AbortSignal) => Promise<EntityId | null>;
  createPack: (title: string) => Promise<EntityId | null>;
  addSticker: (packId: EntityId, imageId: EntityId, emoji: string) => Promise<AddedSticker>;
}

export const fileDigest = async (file: Blob): Promise<string | null> => {
  if (file.size > MAX_HASHED_BYTES || typeof crypto === 'undefined' || !crypto.subtle) return null;
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const packTitle = (title: string, number: number) => {
  const suffix = number > 1 ? ` ${number}` : '';
  return `${title.slice(0, PACK_TITLE_LENGTH - suffix.length)}${suffix}`;
};

const openPack = async (ids: Map<string, EntityId>, title: string, calls: StickerCalls) => {
  const current = ids.get(PACK_KEY);
  if (current !== undefined) return current;
  const number = Number(ids.get(PACK_COUNT_KEY) ?? 0) + 1;
  const pack = await calls.createPack(packTitle(title, number));
  if (pack === null) return null;
  ids.set(PACK_KEY, pack);
  ids.set(PACK_COUNT_KEY, String(number));
  return pack;
};

export const addImportSticker = async (
  file: File, attachment: ParsedAttachment, ids: Map<string, EntityId>, title: string, calls: StickerCalls, signal?: AbortSignal,
) => {
  const image = await calls.upload(file, attachment, signal);
  if (image === null) return null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const pack = await openPack(ids, title, calls);
    if (pack === null) return null;
    const sticker = await calls.addSticker(pack, image, attachment.emoji || DEFAULT_STICKER_EMOJI);
    if (sticker !== 'full') return sticker;
    ids.delete(PACK_KEY);
  }
  return null;
};
