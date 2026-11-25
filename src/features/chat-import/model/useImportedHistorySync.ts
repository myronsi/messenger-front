import { useEffect, useRef } from 'react';
import { realtime } from '@/shared/api/realtime';
import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import { useAppDispatch } from '@/shared/hooks/redux';
import { onOfflineChanges } from '@/shared/offline';
import { importApi } from '../api/importApi';
import type { ImportServerEvent } from '../api/importTypes';

const IMPORT_EVENTS: ReadonlySet<string> = new Set(['import_update', 'import_sender_update']);

const RELOAD_STATES: ReadonlySet<string> = new Set(['done', 'removing']);

export const importEventEffect = (event: unknown): { chatId: string; reload: boolean } | null => {
  const value = event as Partial<ImportServerEvent> | null;
  if (!value || typeof value.type !== 'string' || !IMPORT_EVENTS.has(value.type)) return null;
  if (value.chat_id === undefined || value.chat_id === null) return null;
  const reload = value.type === 'import_update'
    ? RELOAD_STATES.has(value.data?.state ?? '')
    : (value.data as { sender?: { state?: string } } | undefined)?.sender?.state !== 'pending';
  return { chatId: String(value.chat_id), reload };
};

export const useImportedHistorySync = (chatId: EntityId | null, reload: () => unknown) => {
  const dispatch = useAppDispatch();
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  useEffect(() => {
    if (chatId === null || !isPersistedId(chatId)) return undefined;
    const refresh = (reload: boolean) => {
      dispatch(importApi.util.invalidateTags([{ type: 'Chat', id: `imports:${chatId}` }]));
      if (reload) void reloadRef.current();
    };
    const stopRealtime = realtime.subscribe({
      onEvent: (event) => {
        const effect = importEventEffect(event);
        if (effect?.chatId === String(chatId)) refresh(effect.reload);
      },
    });
    const stopOffline = onOfflineChanges((changes) => {
      if (changes.some((change) => change.type === 'imported' && change.chatId === String(chatId))) refresh(true);
    });
    return () => { stopRealtime(); stopOffline(); };
  }, [chatId, dispatch]);
};
