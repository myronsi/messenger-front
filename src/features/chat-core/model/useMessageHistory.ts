import type { Translations } from '@/shared/contexts/LanguageContext';
import { Dispatch, MutableRefObject, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { Message, MessageHistoryResponse, appendUniqueMessages, mergeFreshHistoryMessages, normalizeHistoryMessages, prependUniqueMessages, trimNewestMessages } from '@/entities/message';
import { authFetch } from '@/shared/auth/session';
import { asApiError } from '@/shared/lib/apiError';
import type { ShowError } from './types';
import { fetchMissedMessages } from './fetchMissedMessages';
import { historyPath, toHistoryResponse, useGetMessageHistoryQuery } from '@/entities/message';
import { apiUrl } from '@/shared/api/apiUrl';
import { useMarkChatReadMutation } from '@/entities/chat';
import type { Id } from '@/shared/lib/ids';
import { maxId } from '@/shared/lib/ids';
import { isLocalId, isServerId } from '@/shared/lib/ids';

const MESSAGE_PAGE_SIZE = 50;
// Paging far back drops the newest loaded messages beyond this; they are refetched on the way down.
const MAX_LOADED_MESSAGES = 500;

interface MessageHistoryOptions {
  chatId: Id;
  token: string;
  username: string;
  firstUnreadMessageId?: Id | null;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  currentUserIdRef: MutableRefObject<Id>;
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
  const [oldestMessageId, setOldestMessageId] = useState<Id | null>(null);
  const [newestMessageId, setNewestMessageId] = useState<Id | null>(null);
  const isLoadingOlderMessagesRef = useRef(false);
  const isLoadingNewerMessagesRef = useRef(false);
  const trimNewestPendingRef = useRef(false);
  const [markChatRead] = useMarkChatReadMutation();
  const {
    data: latestHistory,
    isLoading: isLoadingLatestHistory,
    error: latestHistoryError,
  } = useGetMessageHistoryQuery(
    { chatId, limit: MESSAGE_PAGE_SIZE, aroundId: firstUnreadMessageId || undefined },
    { skip: !token || !isServerId(chatId), refetchOnMountOrArgChange: true }
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
    setMessages((previous) => trimNewestMessages(previous, MAX_LOADED_MESSAGES)?.messages ?? previous);
    setNewestMessageId(trimmed.newestId);
    setHasMoreNewerMessages(true);
  }, [messages, setMessages]);

  useEffect(() => {
    setIsLoadingInitialMessages(isLoadingLatestHistory && messages.length === 0);
  }, [isLoadingLatestHistory, messages.length]);

  useEffect(() => {
    if (!latestHistory) return;
    const nextMessages = normalizeHistoryMessages(latestHistory.history);
    setMessages((previous) => mergeFreshHistoryMessages(previous, nextMessages));
    setOldestMessageId(nextMessages[0]?.id || null);
    setNewestMessageId(nextMessages[nextMessages.length - 1]?.id || null);
    setHasMoreMessages(latestHistory.has_more_before ?? latestHistory.has_more);
    setHasMoreNewerMessages(!!latestHistory.has_more_after);
    setIsLoadingInitialMessages(false);
  }, [latestHistory, setMessages]);

  useEffect(() => {
    if (!latestHistoryError) return;
    const status = asApiError(latestHistoryError).status;
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
    setIsLoadingInitialMessages(false);
  }, [latestHistoryError, onBackRef, setModal, translationsRef]);

  const loadOlderMessages = useCallback(async () => {
    if (!token || !oldestMessageId || !hasMoreMessages || isLoadingOlderMessagesRef.current) return;
    isLoadingOlderMessagesRef.current = true;
    setIsLoadingOlderMessages(true);
    try {
      const response = await authFetch(apiUrl(historyPath(chatId, { limit: MESSAGE_PAGE_SIZE, before: oldestMessageId })));
      if (response.ok) {
        const data: MessageHistoryResponse = toHistoryResponse(await response.json(), 'before');
        const olderMessages = normalizeHistoryMessages(data.history);
        setMessages((previous) => prependUniqueMessages(previous, olderMessages));
        trimNewestPendingRef.current = true;
        setHasMoreMessages(data.has_more_before ?? data.has_more);
        if (olderMessages.length > 0) setOldestMessageId(olderMessages[0].id);
      } else if (response.status === 401) {
        setModal({ type: 'error', message: translationsRef.current.loginRequired });
        setTimeout(() => onBackRef.current(), 2000);
      } else if (response.status === 403) {
        onBackRef.current();
      } else {
        throw new Error(translationsRef.current.errorLoading);
      }
    } catch {
      setModal({ type: 'error', message: translationsRef.current.errorLoadingMessages });
    } finally {
      isLoadingOlderMessagesRef.current = false;
      setIsLoadingOlderMessages(false);
    }
  }, [chatId, hasMoreMessages, oldestMessageId, onBackRef, setMessages, setModal, token, translationsRef]);

  const loadNewerMessages = useCallback(async () => {
    if (!token || !newestMessageId || !hasMoreNewerMessages || isLoadingNewerMessagesRef.current) return;
    isLoadingNewerMessagesRef.current = true;
    setIsLoadingNewerMessages(true);
    try {
      const response = await authFetch(apiUrl(historyPath(chatId, { limit: MESSAGE_PAGE_SIZE, after: newestMessageId })));
      if (response.ok) {
        const data: MessageHistoryResponse = toHistoryResponse(await response.json(), 'after');
        const newerMessages = normalizeHistoryMessages(data.history);
        setMessages((previous) => appendUniqueMessages(previous, newerMessages));
        setHasMoreNewerMessages(!!data.has_more_after);
        if (newerMessages.length > 0) setNewestMessageId(newerMessages[newerMessages.length - 1].id);
      } else if (response.status === 401) {
        setModal({ type: 'error', message: translationsRef.current.loginRequired });
        setTimeout(() => onBackRef.current(), 2000);
      } else if (response.status === 403) {
        onBackRef.current();
      } else {
        throw new Error(translationsRef.current.errorLoading);
      }
    } catch {
      setModal({ type: 'error', message: translationsRef.current.errorLoadingMessages });
    } finally {
      isLoadingNewerMessagesRef.current = false;
      setIsLoadingNewerMessages(false);
    }
  }, [chatId, hasMoreNewerMessages, newestMessageId, onBackRef, setMessages, setModal, token, translationsRef]);

  // Replaces the loaded window with the newest page; used when the newest messages were never loaded.
  const loadLatestMessages = useCallback(async () => {
    if (!token || !isServerId(chatId) || isLoadingNewerMessagesRef.current) return;
    isLoadingNewerMessagesRef.current = true;
    setIsLoadingNewerMessages(true);
    try {
      const response = await authFetch(apiUrl(historyPath(chatId, { limit: MESSAGE_PAGE_SIZE })));
      if (response.ok) {
        const data: MessageHistoryResponse = toHistoryResponse(await response.json(), 'latest');
        const latestMessages = normalizeHistoryMessages(data.history);
        setMessages((previous) => [...latestMessages, ...previous.filter((message) => isLocalId(message.id))]);
        setOldestMessageId(latestMessages[0]?.id || null);
        setNewestMessageId(latestMessages[latestMessages.length - 1]?.id || null);
        setHasMoreMessages(data.has_more_before ?? data.has_more);
        setHasMoreNewerMessages(false);
      } else if (response.status === 401) {
        setModal({ type: 'error', message: translationsRef.current.loginRequired });
        setTimeout(() => onBackRef.current(), 2000);
      } else if (response.status === 403) {
        onBackRef.current();
      } else {
        throw new Error(translationsRef.current.errorLoading);
      }
    } catch {
      setModal({ type: 'error', message: translationsRef.current.errorLoadingMessages });
    } finally {
      isLoadingNewerMessagesRef.current = false;
      setIsLoadingNewerMessages(false);
    }
  }, [chatId, onBackRef, setMessages, setModal, token, translationsRef]);

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
    if (!token || !isServerId(chatId) || hasMoreNewerMessagesRef.current || isLoadingNewerMessagesRef.current) return;
    const newestLoadedId = maxId(messagesRef.current.map((message) => message.id).filter(isServerId));
    if (!newestLoadedId) return;
    const isCurrent = () => chatIdRef.current === chatId;
    isLoadingNewerMessagesRef.current = true;
    try {
      const data = await fetchMissedMessages(chatId, newestLoadedId, MESSAGE_PAGE_SIZE, isCurrent);
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
  }, [chatId, setMessages, token]);

  const applyReadReceiptBatch = useCallback((
    messageIds: Id[],
    readerUserId: Id,
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

  const markMessagesRead = useCallback(async (messageIds: Id[]) => {
    const uniqueMessageIds = Array.from(new Set(messageIds.filter((messageId) => isServerId(messageId))));
    if (!uniqueMessageIds.length || !currentUserIdRef.current) return;
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
