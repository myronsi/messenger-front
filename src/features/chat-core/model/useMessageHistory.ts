import { isPersistedId, compareIds } from '@/shared/api/entityId';
import type { EntityId } from '@/shared/api/entityId';
import type { Translations } from '@/shared/contexts/LanguageContext';
import { Dispatch, MutableRefObject, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import {
  Message, appendUniqueMessages, mergeFreshHistoryMessages, normalizeHistoryMessages, prependUniqueMessages, trimNewestMessages,
} from '@/entities/message';
import { asApiError } from '@/shared/lib/apiError';
import type { ShowError } from './types';
import { fetchMissedMessages } from './fetchMissedMessages';
import { useGetMessageHistoryQuery, useLazyGetMessageHistoryQuery } from '@/entities/message';
import { useMarkChatReadMutation } from '@/entities/chat';

const MESSAGE_PAGE_SIZE = 50;
export const MAX_LOADED_MESSAGES = 500;

interface MessageHistoryOptions {
  chatId: EntityId;
  token: string;
  username: string;
  firstUnreadMessageId?: EntityId | null;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  currentUserIdRef: MutableRefObject<EntityId>;
  onBackRef: MutableRefObject<() => void>;
  translationsRef: MutableRefObject<Translations>;
  setModal: ShowError;
}

export const useMessageHistory = ({
  chatId,
  token,
  username,
  firstUnreadMessageId,
  messages,
  setMessages,
  currentUserIdRef,
  onBackRef,
  translationsRef,
  setModal,
}: MessageHistoryOptions) => {
  const [isLoadingInitialMessages, setIsLoadingInitialMessages] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [isLoadingNewerMessages, setIsLoadingNewerMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [hasMoreNewerMessages, setHasMoreNewerMessages] = useState(false);
  const [oldestMessageId, setOldestMessageId] = useState<EntityId | null>(null);
  const [newestMessageId, setNewestMessageId] = useState<EntityId | null>(null);
  const isLoadingOlderMessagesRef = useRef(false);
  const isLoadingNewerMessagesRef = useRef(false);
  const trimNewestPendingRef = useRef(false);
  const [markChatRead] = useMarkChatReadMutation();
  const [fetchHistory] = useLazyGetMessageHistoryQuery();
  const {
    currentData: latestHistory,
    isLoading: isLoadingLatestHistory,
    error: latestHistoryError,
  } = useGetMessageHistoryQuery(
    { chatId, limit: MESSAGE_PAGE_SIZE, aroundId: firstUnreadMessageId || undefined },
    { skip: !token || !isPersistedId(chatId), refetchOnMountOrArgChange: true }
  );

  useEffect(() => () => {
    isLoadingOlderMessagesRef.current = false;
    isLoadingNewerMessagesRef.current = false;
    setIsLoadingOlderMessages(false);
    setIsLoadingNewerMessages(false);
    setIsLoadingInitialMessages(false);
    setHasMoreMessages(false);
    setHasMoreNewerMessages(false);
    setOldestMessageId(null);
    setNewestMessageId(null);
    trimNewestPendingRef.current = false;
  }, [chatId]);

  useEffect(() => {
    if (!trimNewestPendingRef.current) return;
    trimNewestPendingRef.current = false;
    const trimmed = trimNewestMessages(messages, MAX_LOADED_MESSAGES);
    if (!trimmed || !trimmed.newestId) return;
    setMessages(previous => trimNewestMessages(previous, MAX_LOADED_MESSAGES)?.messages ?? previous);
    setNewestMessageId(trimmed.newestId);
    setHasMoreNewerMessages(true);
  }, [messages, setMessages]);

  const handleHistoryError = useCallback((error: unknown) => {
    const status = asApiError(error).status;
    if (status === 401) {
      setModal({ type: 'error', message: translationsRef.current.loginRequired });
      setTimeout(() => onBackRef.current(), 2000);
      return;
    }
    if (status === 403) {
      onBackRef.current();
      return;
    }
    setModal({ type: 'error', message: translationsRef.current.errorLoadingMessages });
  }, [onBackRef, setModal, translationsRef]);

  useEffect(() => {
    setIsLoadingInitialMessages(isLoadingLatestHistory && messages.length === 0);
  }, [isLoadingLatestHistory, messages.length]);

  useEffect(() => {
    if (!latestHistory) return;
    const nextMessages = normalizeHistoryMessages(latestHistory.history);
    const pageWindow = { hasMoreBefore: latestHistory.has_more_before ?? latestHistory.has_more, hasMoreAfter: !!latestHistory.has_more_after };
    setMessages((previous) => mergeFreshHistoryMessages(previous, nextMessages, pageWindow));
    setOldestMessageId(latestHistory.next_before_id ?? nextMessages[0]?.id ?? null);
    setNewestMessageId(latestHistory.next_after_id ?? nextMessages[nextMessages.length - 1]?.id ?? null);
    setHasMoreMessages(latestHistory.has_more_before ?? latestHistory.has_more);
    setHasMoreNewerMessages(!!latestHistory.has_more_after);
    setIsLoadingInitialMessages(false);
  }, [latestHistory, setMessages]);

  useEffect(() => {
    if (!latestHistoryError) return;
    handleHistoryError(latestHistoryError);
    setIsLoadingInitialMessages(false);
  }, [latestHistoryError, handleHistoryError]);

  const loadOlderMessages = useCallback(async () => {
    if (!token || !oldestMessageId || !hasMoreMessages || isLoadingOlderMessagesRef.current) return;
    isLoadingOlderMessagesRef.current = true;
    setIsLoadingOlderMessages(true);
    try {
      const data = await fetchHistory({ chatId, limit: MESSAGE_PAGE_SIZE, beforeId: oldestMessageId }).unwrap();
      const olderMessages = normalizeHistoryMessages(data.history);
      setMessages(previous => prependUniqueMessages(previous, olderMessages));
      trimNewestPendingRef.current = true;
      setHasMoreMessages(data.has_more_before ?? data.has_more);
      const nextOldestId = data.next_before_id ?? olderMessages[0]?.id;
      if (nextOldestId != null) setOldestMessageId(nextOldestId);
    } catch (error) {
      handleHistoryError(error);
    } finally {
      isLoadingOlderMessagesRef.current = false;
      setIsLoadingOlderMessages(false);
    }
  }, [fetchHistory, chatId, handleHistoryError, hasMoreMessages, oldestMessageId, setMessages, token]);

  const loadNewerMessages = useCallback(async () => {
    if (!token || !newestMessageId || !hasMoreNewerMessages || isLoadingNewerMessagesRef.current) return;
    isLoadingNewerMessagesRef.current = true;
    setIsLoadingNewerMessages(true);
    try {
      const data = await fetchHistory({ chatId, limit: MESSAGE_PAGE_SIZE, afterId: newestMessageId }).unwrap();
      const newerMessages = normalizeHistoryMessages(data.history);
      setMessages(previous => appendUniqueMessages(previous, newerMessages));

      setHasMoreNewerMessages(!!data.has_more_after);
      const nextNewestId = data.next_after_id ?? newerMessages[newerMessages.length - 1]?.id;
      if (nextNewestId != null) setNewestMessageId(nextNewestId);
    } catch (error) {
      handleHistoryError(error);
    } finally {
      isLoadingNewerMessagesRef.current = false;
      setIsLoadingNewerMessages(false);
    }
  }, [fetchHistory, chatId, handleHistoryError, hasMoreNewerMessages, newestMessageId, setMessages, token]);

  // Merge the newest page without discarding confirmed messages already in the shared cache.
  const loadLatestMessages = useCallback(async () => {
    if (!token || !isPersistedId(chatId) || isLoadingNewerMessagesRef.current) return;
    isLoadingNewerMessagesRef.current = true;
    setIsLoadingNewerMessages(true);
    try {
      const data = await fetchHistory({ chatId, limit: MESSAGE_PAGE_SIZE }).unwrap();
      const latestMessages = normalizeHistoryMessages(data.history);
      const pageWindow = { hasMoreBefore: data.has_more_before ?? data.has_more, hasMoreAfter: Boolean(data.has_more_after) };
      setMessages(previous => mergeFreshHistoryMessages(previous, latestMessages, pageWindow));
      setOldestMessageId(data.next_before_id ?? latestMessages[0]?.id ?? null);
      setNewestMessageId(data.next_after_id ?? latestMessages[latestMessages.length - 1]?.id ?? null);
      setHasMoreMessages(data.has_more_before ?? data.has_more);
      setHasMoreNewerMessages(Boolean(data.has_more_after));
    } catch (error) {
      handleHistoryError(error);
    } finally {
      isLoadingNewerMessagesRef.current = false;
      setIsLoadingNewerMessages(false);
    }
  }, [fetchHistory, chatId, handleHistoryError, setMessages, token]);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const hasMoreNewerMessagesRef = useRef(hasMoreNewerMessages);
  hasMoreNewerMessagesRef.current = hasMoreNewerMessages;

  const chatIdRef = useRef(chatId);
  chatIdRef.current = chatId;

  // Loads messages sent while the socket was down. If the user is reading older history the newer pages
  // load on scroll anyway; otherwise fetch everything after the newest loaded message. If that keeps
  // failing, the missed messages are left to the normal load-newer-on-scroll path.
  const catchUpAfterReconnect = useCallback(async () => {
    if (!token || !isPersistedId(chatId) || hasMoreNewerMessagesRef.current || isLoadingNewerMessagesRef.current) return;
    const newestLoadedId = messagesRef.current.reduce<EntityId>((newest, message) => compareIds(newest, message.id) > 0 ? newest : message.id, 0);
    if (!isPersistedId(newestLoadedId)) { await loadLatestMessages(); return; }
    const isCurrent = () => String(chatIdRef.current) === String(chatId);
    isLoadingNewerMessagesRef.current = true;
    try {
      const data = await fetchMissedMessages(chatId, newestLoadedId, MESSAGE_PAGE_SIZE, isCurrent, args => fetchHistory(args).unwrap());
      if (!isCurrent()) return;
      const missedMessages = data ? normalizeHistoryMessages(data.history) : [];
      if (missedMessages.length > 0) {
        setMessages((previous) => appendUniqueMessages(previous, missedMessages));
        setNewestMessageId(missedMessages[missedMessages.length - 1].id);
      } else if (!data) {
        setNewestMessageId(newestLoadedId);
      }
      // More than a page was missed, or the request failed: the rest loads on scroll like any newer page.
      if (!data || data.has_more_after) setHasMoreNewerMessages(true);
    } finally {
      isLoadingNewerMessagesRef.current = false;
    }
  }, [fetchHistory, chatId, setMessages, token, loadLatestMessages]);

  const applyReadReceiptBatch = useCallback((
    messageIds: EntityId[],
    readerUserId: EntityId,
    readAt: string,
    reader?: { username?: string; display_name?: string; avatar_url?: string }
  ) => {
    if (!messageIds.length || !readerUserId) return;
    const readMessageIds = new Set(messageIds);
    setMessages((previous) => previous.map((message) => {
      if (!readMessageIds.has(message.id)) return message;
      const readBy = message.read_by || [];
      if (readBy.some((read) => read.user_id === readerUserId)) return message;
      return {
        ...message,
        read_by: [...readBy, {
          user_id: readerUserId,
          username: reader?.username,
          display_name: reader?.display_name,
          avatar_url: reader?.avatar_url,
          read_at: readAt,
        }],
      };
    }));
  }, [setMessages]);

  const markMessagesRead = useCallback(async (messageIds: EntityId[]) => {
    const uniqueMessageIds = Array.from(new Set(messageIds.filter((messageId) => isPersistedId(messageId))));
    if (!uniqueMessageIds.length || !isPersistedId(currentUserIdRef.current)) return;
    const result = await markChatRead({ chatId, messageIds: uniqueMessageIds }).unwrap();
    applyReadReceiptBatch(
      result.read_message_ids || uniqueMessageIds,
      currentUserIdRef.current,
      result.read_at || new Date().toISOString(),
      { username }
    );
  }, [applyReadReceiptBatch, chatId, currentUserIdRef, markChatRead, username]);

  return {
    isLoadingInitialMessages,
    isLoadingOlderMessages,
    isLoadingNewerMessages,
    hasMoreMessages,
    hasMoreNewerMessages,
    loadOlderMessages,
    loadNewerMessages,
    loadLatestMessages,
    catchUpAfterReconnect,
    markMessagesRead,
    applyReadReceiptBatch,
  };
};
