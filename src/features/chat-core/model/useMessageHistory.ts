import { Dispatch, MutableRefObject, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { Message, MessageHistoryResponse, appendUniqueMessages, mergeFreshHistoryMessages, normalizeHistoryMessages, prependUniqueMessages } from '@/entities/message';
import { authFetch } from '@/shared/auth/session';
import { useGetMessageHistoryQuery, useMarkChatReadMutation } from '@/app/api/messengerApi';

const BASE_URL = import.meta.env.VITE_BASE_URL;
const MESSAGE_PAGE_SIZE = 50;

interface MessageHistoryOptions {
  chatId: number;
  token: string;
  username: string;
  firstUnreadMessageId?: number | null;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  currentUserIdRef: MutableRefObject<number>;
  onBackRef: MutableRefObject<() => void>;
  translationsRef: MutableRefObject<Record<string, any>>;
  setModal: (modal: any) => void;
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
  const [oldestMessageId, setOldestMessageId] = useState<number | null>(null);
  const [newestMessageId, setNewestMessageId] = useState<number | null>(null);
  const isLoadingOlderMessagesRef = useRef(false);
  const isLoadingNewerMessagesRef = useRef(false);
  const [markChatRead] = useMarkChatReadMutation();
  const {
    data: latestHistory,
    isLoading: isLoadingLatestHistory,
    error: latestHistoryError,
  } = useGetMessageHistoryQuery(
    { chatId, limit: MESSAGE_PAGE_SIZE, aroundId: firstUnreadMessageId || undefined },
    { skip: !token || chatId <= 0, refetchOnMountOrArgChange: true }
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
  }, [chatId]);

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
    const status = (latestHistoryError as any)?.status;
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
      const params = new URLSearchParams({ limit: String(MESSAGE_PAGE_SIZE), before_id: String(oldestMessageId) });
      const response = await authFetch(`${BASE_URL}/messages/history/${chatId}?${params.toString()}`);
      if (response.ok) {
        const data: MessageHistoryResponse = await response.json();
        const olderMessages = normalizeHistoryMessages(data.history);
        setMessages((previous) => prependUniqueMessages(previous, olderMessages));
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
      const params = new URLSearchParams({ limit: String(MESSAGE_PAGE_SIZE), after_id: String(newestMessageId) });
      const response = await authFetch(`${BASE_URL}/messages/history/${chatId}?${params.toString()}`);
      if (response.ok) {
        const data: MessageHistoryResponse = await response.json();
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
    if (!token || chatId <= 0 || isLoadingNewerMessagesRef.current) return;
    isLoadingNewerMessagesRef.current = true;
    setIsLoadingNewerMessages(true);
    try {
      const params = new URLSearchParams({ limit: String(MESSAGE_PAGE_SIZE) });
      const response = await authFetch(`${BASE_URL}/messages/history/${chatId}?${params.toString()}`);
      if (response.ok) {
        const data: MessageHistoryResponse = await response.json();
        const latestMessages = normalizeHistoryMessages(data.history);
        setMessages((previous) => [...latestMessages, ...previous.filter((message) => message.id < 0)]);
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

  const applyReadReceiptBatch = useCallback((
    messageIds: number[],
    readerUserId: number,
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

  const markMessagesRead = useCallback(async (messageIds: number[]) => {
    const uniqueMessageIds = Array.from(new Set(messageIds.filter((messageId) => messageId > 0)));
    if (!uniqueMessageIds.length || currentUserIdRef.current <= 0) return;
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
    markMessagesRead,
    applyReadReceiptBatch,
  };
};
