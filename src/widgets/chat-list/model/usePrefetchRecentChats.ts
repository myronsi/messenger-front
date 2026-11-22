import { useEffect } from 'react';
import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import { getAccessToken, subscribeToAccessToken } from '@/shared/auth/session';
import { useAppDispatch } from '@/shared/hooks/redux';
import { useLatestRef } from '@/shared/lib/useLatestRef';
import { MESSAGE_PAGE_SIZE, messageApi } from '@/entities/message';

export const PREFETCH_CHATS = 15;
export const PREFETCH_START_DELAY_MS = 1500;
const PREFETCH_PARALLEL = 3;

interface PrefetchableChat {
  id: EntityId;
  first_unread_message_id?: EntityId | null;
  is_request?: boolean;
}

const prefetched = new Set<string>();

export const resetPrefetchedChats = () => prefetched.clear();

export const chatsToPrefetch = (chats: PrefetchableChat[]) => chats
  .filter((chat) => isPersistedId(chat.id) && !chat.is_request && !prefetched.has(String(chat.id)))
  .slice(0, PREFETCH_CHATS);

const savesData = () => {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !!connection?.saveData;
};

export const usePrefetchRecentChats = (chats: PrefetchableChat[]) => {
  const dispatch = useAppDispatch();
  const ready = chats.length > 0;
  const chatsRef = useLatestRef(chats);

  useEffect(() => {
    if (!ready || savesData()) return undefined;
    let cancelled = false;
    let stopWaiting = () => undefined as void;
    const run = async () => {
      const queue = chatsToPrefetch(chatsRef.current);
      const worker = async () => {
        while (!cancelled && queue.length) {
          const chat = queue.shift()!;
          prefetched.add(String(chat.id));
          const request = dispatch(messageApi.endpoints.getMessageHistory.initiate(
            { chatId: chat.id, limit: MESSAGE_PAGE_SIZE, aroundId: chat.first_unread_message_id || undefined },
            { subscribe: false },
          ));
          await Promise.resolve(request).catch(() => undefined);
        }
      };
      await Promise.all(Array.from({ length: PREFETCH_PARALLEL }, worker));
    };
    const start = () => {
      if (getAccessToken()) {
        void run();
        return;
      }
      const unsubscribe = subscribeToAccessToken((token) => {
        if (!token) return;
        unsubscribe();
        if (!cancelled) void run();
      });
      stopWaiting = () => { unsubscribe(); };
    };
    const timer = window.setTimeout(start, PREFETCH_START_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      stopWaiting();
    };
  }, [ready, dispatch, chatsRef]);
};
