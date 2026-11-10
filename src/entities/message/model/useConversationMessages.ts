import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';
import { useAppDispatch } from '@/shared/hooks/redux';
import { getAccessToken } from '@/shared/auth/session';
import { getTokenSubject } from '@/shared/auth/tokenClaims';
import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import { conversationApi, messageSelectors, toMessageState, useGetConversationQuery } from '../api/conversationApi';
import type { Message } from './types';

const accountId = () => getTokenSubject(getAccessToken()) || '';
const empty: Message[] = [];

// History pages, optimistic sends, acknowledgements and live updates all write
// the same normalized RTK cache. Revisiting a chat reuses that authoritative store.
export const useConversationMessages = (chatId: EntityId) => {
  const account = accountId();
  const arg = useMemo(() => ({ chatId: String(chatId), account }), [chatId, account]);
  const { data } = useGetConversationQuery(arg, { skip: !isPersistedId(chatId) });
  const dispatch = useAppDispatch();
  const messages = useMemo(() => data ? messageSelectors.selectAll(data) : empty, [data]);
  const setMessages: Dispatch<SetStateAction<Message[]>> = useCallback(update => {
    dispatch((dispatch, getState) => {
      if (account !== accountId() || !isPersistedId(chatId)) return;
      const current = conversationApi.endpoints.getConversation.select(arg)(getState()).data;
      const previous = current ? messageSelectors.selectAll(current) : [];
      const next = typeof update === 'function' ? update(previous) : update;
      if (next === previous) return;
      const value = toMessageState(next);
      if (current) dispatch(conversationApi.util.updateQueryData('getConversation', arg, () => value));
      else dispatch(conversationApi.util.upsertQueryEntries([{ endpointName: 'getConversation', arg, value }]));
    });
  }, [account, arg, chatId, dispatch]);
  return { messages, setMessages };
};
