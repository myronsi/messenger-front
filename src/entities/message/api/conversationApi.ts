import { createEntityAdapter } from '@reduxjs/toolkit';
import { messengerApi } from '@/shared/api/baseApi';
import { compareIds, isPersistedId } from '@/shared/api/entityId';
import type { Message } from '../model/types';

export const messageEntities = createEntityAdapter<Message>({
  sortComparer: (a, b) => {
    const confirmedA = isPersistedId(a.id), confirmedB = isPersistedId(b.id);
    if (confirmedA && confirmedB) return compareIds(a.id, b.id);
    return confirmedA ? -1 : confirmedB ? 1 : 0;
  },
});
export const messageSelectors = messageEntities.getSelectors();

export const conversationApi = messengerApi.injectEndpoints({
  endpoints: builder => ({
    getConversation: builder.query<ReturnType<typeof messageEntities.getInitialState>, { chatId: string; account: string }>({
      queryFn: () => ({ data: messageEntities.getInitialState() }),
      // A late initial cache subscription must not replace optimistic/live rows.
      merge: (current, incoming) => { messageEntities.upsertMany(current, messageSelectors.selectAll(incoming)); },
      keepUnusedDataFor: 300,
    }),
  }),
});

export const { useGetConversationQuery } = conversationApi;
