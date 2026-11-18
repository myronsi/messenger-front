import type { EmojiPack } from '@/entities/emoji';

export const MAX_EMOJI_PACKS = 100;
export const MAX_PACK_EMOJI = 200;
export const MAX_GROUP_EMOJI = 50;

export const maxEmojiOf = (pack: Pick<EmojiPack, 'chat_id'>) => (pack.chat_id ? MAX_GROUP_EMOJI : MAX_PACK_EMOJI);
