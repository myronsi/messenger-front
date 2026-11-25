import type { EntityId } from '@/shared/api/entityId';
import type { Message, ModerationRemovalReason } from './types';

export const MODERATION_RULES = ['spam', 'scam', 'harassment', 'impersonation', 'inappropriate_profile', 'illegal', 'other'] as const;
export type ModerationRule = typeof MODERATION_RULES[number];

export const moderationRule = (code: string | undefined | null): ModerationRule =>
  (MODERATION_RULES as readonly string[]).includes(code ?? '') ? code as ModerationRule : 'other';

export const applyModerationRemoval = (messages: Message[], messageId: EntityId, reason?: ModerationRemovalReason | null): Message[] =>
  messages.map((message) => (message.id === messageId ? {
    ...message,
    content: '',
    sticker: undefined,
    poll: undefined,
    contact: undefined,
    location: undefined,
    reactions: [],
    is_deleting: false,
    is_deleted: true,
    removed_by_moderation: true,
    moderation_reason: reason ?? message.moderation_reason ?? null,
  } : message));
