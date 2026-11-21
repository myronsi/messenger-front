import { useCallback, useEffect } from 'react';
import { current } from '@reduxjs/toolkit';
import { realtime } from '@/shared/api/realtime';
import { isGoApi } from '@/shared/api/goSocket';
import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import { useAppDispatch } from '@/shared/hooks/redux';
import {
  findPin, onLocalMessageDeleted, pinApi, removePin, useGetPinnedMessagesQuery, useLoadMorePinnedMessagesMutation, type PinnedMessages,
} from '@/entities/message';
import { applyPinEvent } from './pinEvents';

const EMPTY: PinnedMessages = { items: [], next_cursor: null, count: 0 };

export const pinsEnabled = (chatId: EntityId) => isGoApi() && isPersistedId(chatId);

export const usePinnedMessages = (chatId: EntityId) => {
  const dispatch = useAppDispatch();
  const skip = !pinsEnabled(chatId);
  const { data = EMPTY, isError, refetch } = useGetPinnedMessagesQuery(chatId, { skip });
  const [loadMorePins, { isLoading: isLoadingMore }] = useLoadMorePinnedMessagesMutation();

  useEffect(() => {
    if (skip) return undefined;
    const reload = () => void dispatch(pinApi.endpoints.getPinnedMessages.initiate(chatId, { forceRefetch: true, subscribe: false }));
    const stopRealtime = realtime.subscribe({
      onOpen: ({ reconnected }) => { if (reconnected) reload(); },
      onEvent: (event) => {
        let needsReload = false;
        dispatch(pinApi.util.updateQueryData('getPinnedMessages', chatId, (draft) => {
          const effect = applyPinEvent(current(draft), event, String(chatId));
          if (!effect) return undefined;
          needsReload = effect.reload;
          return effect.next;
        }));
        if (needsReload) reload();
      },
    });
    const stopLocal = onLocalMessageDeleted(({ chatId: deletedIn, messageId }) => {
      if (String(deletedIn) !== String(chatId)) return;
      dispatch(pinApi.util.updateQueryData('getPinnedMessages', chatId, (draft) => removePin(current(draft), messageId)));
    });
    return () => { stopRealtime(); stopLocal(); };
  }, [chatId, dispatch, skip]);

  const loadMore = useCallback(() => {
    if (data.next_cursor && !isLoadingMore) void loadMorePins({ chatId, after: data.next_cursor });
  }, [chatId, data.next_cursor, isLoadingMore, loadMorePins]);

  const pinOf = useCallback((messageId: EntityId) => findPin(data, messageId), [data]);

  return {
    pins: data.items,
    count: data.count ?? data.items.length,
    hasMore: !!data.next_cursor,
    isLoadingMore,
    isError,
    retry: refetch,
    loadMore,
    pinOf,
  };
};
