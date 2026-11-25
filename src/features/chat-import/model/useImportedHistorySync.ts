import { useEffect, useRef } from 'react';
import { realtime } from '@/shared/api/realtime';
import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import { useAppDispatch } from '@/shared/hooks/redux';
import { onOfflineChanges } from '@/shared/offline';
import { importApi } from '../api/importApi';
import type { ImportServerEvent } from '../api/importTypes';

const IMPORT_EVENTS: ReadonlySet<string> = new Set(['import_update', 'import_sender_update']);

export const importEventChat = (event: unknown): string | null => {
  const value = event as Partial<ImportServerEvent> | null;
  if (!value || typeof value.type !== 'string' || !IMPORT_EVENTS.has(value.type)) return null;
  const chatId = value.chat_id;
  return chatId === undefined || chatId === null ? null : String(chatId);
};

export const useImportedHistorySync = (chatId: EntityId | null, reload: () => unknown) => {
  const dispatch = useAppDispatch();
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  useEffect(() => {
    if (chatId === null || !isPersistedId(chatId)) return undefined;
    const refresh = () => {
      dispatch(importApi.util.invalidateTags([{ type: 'Chat', id: `imports:${chatId}` }]));
      void reloadRef.current();
    };
    const stopRealtime = realtime.subscribe({
      onEvent: (event) => { if (importEventChat(event) === String(chatId)) refresh(); },
    });
    const stopOffline = onOfflineChanges((changes) => {
      if (changes.some((change) => change.type === 'imported' && change.chatId === String(chatId))) refresh();
    });
    return () => { stopRealtime(); stopOffline(); };
  }, [chatId, dispatch]);
};
