import { useEffect } from 'react';
import { removeMessageAnimated, type Message } from '@/entities/message';
import type { EntityId } from '@/shared/api/entityId';
import { isPersistedId } from '@/shared/api/entityId';
import { onOfflineChanges, withOfflineDb } from '@/shared/offline';
import type { ServerEvent } from './socketEvents';
import type { SetMessages } from './types';

export const mirrorEventOffline = (chatId: EntityId, event: ServerEvent) => {
  if (!isPersistedId(chatId)) return;
  if (event.type === 'delete' && !event.removed_by_moderation) withOfflineDb((db) => db.removeMessages(chatId, [event.message_id]));
  else if (event.type === 'history_cleared') withOfflineDb((db) => db.clearUpTo(chatId, event.before_message_id));
  else if (event.type === 'chat_deleted' && (event.chat_id == null || String(event.chat_id) === String(chatId))) {
    withOfflineDb((db) => db.dropChat(chatId));
  }
};

const isAfter = (message: Message, beforeId: string) => !isPersistedId(message.id) || BigInt(message.id) > BigInt(beforeId);

export const useOfflineChanges = (chatId: EntityId, setMessages: SetMessages) => {
  useEffect(() => onOfflineChanges((changes) => {
    for (const change of changes) {
      if (change.type === 'reset' || change.chatId !== String(chatId)) continue;
      if (change.type === 'updated') {
        const fresh = change.message as unknown as Message;
        setMessages((previous) => previous.map((message) => (String(message.id) === String(fresh.id) ? { ...message, ...fresh } : message)));
      } else if (change.type === 'deleted') {
        removeMessageAnimated(setMessages, change.messageId);
      } else if (change.type === 'cleared') {
        setMessages((previous) => previous.filter((message) => isAfter(message, change.beforeId)));
      }
    }
  }), [chatId, setMessages]);
};
