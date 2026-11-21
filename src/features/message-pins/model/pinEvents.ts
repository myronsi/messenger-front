import type { ServerEvent } from '@myronsi/messenger-api';
import { messageModel } from '@/shared/api/goModels';
import { clearPinsUpTo, findPin, removePin, updatePinnedMessage, type Message, type PinnedMessages } from '@/entities/message';

export interface PinEventEffect {
  next: PinnedMessages;
  reload: boolean;
}

const withCount = (state: PinnedMessages, count: number | undefined) => (count === undefined ? state : { ...state, count });

export const applyPinEvent = (state: PinnedMessages, event: ServerEvent, chatId: string): PinEventEffect | null => {
  if (event.chat_id !== chatId) return null;
  switch (event.type) {
    case 'pin_update': {
      const { message_id: messageId, action, scope, pinned_message_count: count } = event.data;
      if (action === 'unpinned') return { next: withCount(removePin(state, messageId), count), reload: scope === 'everyone' };
      const known = findPin(state, messageId);
      return { next: withCount(state, count), reload: !known || known.scope !== scope };
    }
    case 'edit': return { next: updatePinnedMessage(state, messageModel(event.data.message) as unknown as Message), reload: false };
    case 'delete': return { next: removePin(state, event.data.message_id), reload: false };
    case 'history_cleared': return { next: clearPinsUpTo(state, event.data.before_message_id), reload: false };
    default: return null;
  }
};
