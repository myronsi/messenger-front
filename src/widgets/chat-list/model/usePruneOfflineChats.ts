import { useEffect } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import { withOfflineDb } from '@/shared/offline';

export const usePruneOfflineChats = (direct: { id: EntityId }[] | undefined, groups: { chat_id: EntityId }[] | undefined) => {
  useEffect(() => {
    if (!direct || !groups) return;
    const live = new Set([...direct.map((chat) => String(chat.id)), ...groups.map((group) => String(group.chat_id))]);
    withOfflineDb(async (db) => {
      for (const chatId of await db.chatIds()) if (!live.has(chatId)) await db.dropChat(chatId);
    });
  }, [direct, groups]);
};
