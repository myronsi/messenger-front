import { customReaction, parseEmojiTokens } from '@/shared/lib/customEmoji';

export const BASE_REACTIONS = ['👍', '🥰', '😠', '😂', '😢'];
const RECENT_CUSTOM = 2;

export const recentCustomReactions = (recent: string[]) => recent
  .flatMap((value) => parseEmojiTokens(value).slice(0, 1).map((token) => customReaction(token.id)))
  .slice(0, RECENT_CUSTOM);
