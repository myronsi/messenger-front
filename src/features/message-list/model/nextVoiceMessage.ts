import type { EntityId } from '@/shared/api/entityId';
import type { Message } from '@/entities/message';

const isVoice = (message: Message) => (
  message.type === 'file' && typeof message.content !== 'string' && message.content?.file_type === 'voice' && !message.is_deleted
);

export const nextVoiceMessageId = (messages: Message[], endedId: EntityId): EntityId | null => {
  const index = messages.findIndex((message) => message.id === endedId);
  if (index === -1) return null;
  return messages.slice(index + 1).find(isVoice)?.id ?? null;
};
