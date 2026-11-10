import { createEntityAdapter } from '@reduxjs/toolkit';
import { messengerApi } from '@/shared/api/baseApi';
import { compareIds, isPersistedId, type EntityId } from '@/shared/api/entityId';
import type { Message } from '../model/types';

const compareConfirmedIds = (left: EntityId, right: EntityId) => {
  const a = String(left), b = String(right);
  if (a.length === b.length) return a < b ? -1 : a > b ? 1 : 0;
  if (a[0] !== '0' && b[0] !== '0') return a.length < b.length ? -1 : 1;
  return compareIds(left, right);
};

export const compareMessageOrder = (a: Message, b: Message) => {
  const confirmedA = isPersistedId(a.id), confirmedB = isPersistedId(b.id);
  if (confirmedA && confirmedB) return compareConfirmedIds(a.id, b.id);
  return confirmedA ? -1 : confirmedB ? 1 : 0;
};

export const messageEntities = createEntityAdapter<Message>({ sortComparer: compareMessageOrder });
export const messageSelectors = messageEntities.getSelectors();
type MessageState = ReturnType<typeof messageEntities.getInitialState>;

export const toMessageState = (messages: Message[]): MessageState => {
  const ids: EntityId[] = [];
  const entities: Record<EntityId, Message> = {};
  let confirmedRun = true;
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (message.id in entities) return messageEntities.setAll(messageEntities.getInitialState(), messages);
    const confirmed = isPersistedId(message.id);
    if (confirmed && !confirmedRun) return messageEntities.setAll(messageEntities.getInitialState(), messages);
    if (confirmed && index > 0 && compareConfirmedIds(messages[index - 1].id, message.id) >= 0) {
      return messageEntities.setAll(messageEntities.getInitialState(), messages);
    }
    confirmedRun = confirmed;
    ids.push(message.id);
    entities[message.id] = message;
  }
  return { ids, entities };
};

export const conversationApi = messengerApi.injectEndpoints({
  endpoints: builder => ({
    getConversation: builder.query<MessageState, { chatId: string; account: string }>({
      queryFn: () => ({ data: messageEntities.getInitialState() }),
      // A late initial cache subscription must not replace optimistic/live rows.
      merge: (current, incoming) => { messageEntities.upsertMany(current, messageSelectors.selectAll(incoming)); },
      keepUnusedDataFor: 300,
    }),
  }),
});

export const { useGetConversationQuery } = conversationApi;
