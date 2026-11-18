import type { EntityId } from '@/shared/api/entityId';
import type { Chat } from '@/entities/message';

const record = (value: unknown): Record<string, unknown> => typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};

export function createRequestChatTracker() {
  const announced = new Map<string, boolean>();
  return {
    observe(frame: unknown) {
      const event = record(frame);
      if (event.type !== 'chat_created' && event.type !== 'chat_list_update') return;
      const chat = record(record(event.data).chat);
      const id = String(chat.id ?? event.chat_id ?? '');
      if (id && typeof chat.is_request === 'boolean') announced.set(id, chat.is_request);
    },
    isRequest(frame: unknown, chatsById: Record<EntityId, Chat>) {
      const id = String(record(frame).chat_id ?? '');
      if (!id) return false;
      const listed = chatsById[id];
      if (listed) return !!listed.is_request && announced.get(id) !== false;
      return announced.get(id) === true;
    },
  };
}
