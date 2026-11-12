import type { EntityId } from '@/shared/api/entityId';
import type { Message } from '@/entities/message';

export const messageCopyText = (message: Message) => {
  if (message.sticker) return '';
  const text = typeof message.content === 'string' ? message.content : message.content?.caption ?? '';
  return text.trim();
};

export const selectionCopyText = (messages: Message[], ids: ReadonlySet<EntityId>) => messages
  .filter((message) => ids.has(message.id))
  .map(messageCopyText)
  .filter(Boolean)
  .join('\n\n');

export const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
};
