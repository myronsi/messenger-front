import type { components } from '@/shared/api/generated/schema';

export type Sticker = components['schemas']['Sticker'];
export type StickerPack = components['schemas']['StickerPack'];

export interface StickerPackRef {
  packId?: string;
  slug?: string;
}
