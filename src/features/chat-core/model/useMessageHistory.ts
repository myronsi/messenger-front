import type { Translations } from '@/shared/contexts/LanguageContext';
import { Dispatch, MutableRefObject, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { Message, MessageHistoryResponse, appendUniqueMessages, mergeFreshHistoryMessages, normalizeHistoryMessages, prependUniqueMessages, trimNewestMessages } from '@/entities/message';
import { authFetch } from '@/shared/auth/session';
import { asApiError } from '@/shared/lib/apiError';
import type { ShowError } from './types';
import { fetchMissedMessages } from './fetchMissedMessages';
import { useOwnReadReceipts } from './useOwnReadReceipts';
import { historyDirection, historyPath, toHistoryResponse, useGetMessageHistoryQuery } from '@/entities/message';
import type { HistoryRequest } from '@/entities/message';
import { apiUrl } from '@/shared/api/apiUrl';
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
  // Opens the chat around this message instead (a search result); the first unread message otherwise.
  focusMessageId?: Id | null;
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
  focusMessageId,
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
  // Changes whenever the loaded window is replaced (a jump, the newest page). Pages requested for an earlier
  // window are dropped: their cursors belong to messages that are no longer loaded.
  const windowVersionRef = useRef(0);
  const isReplacingWindowRef = useRef(false);
  const {
    data: latestHistory,
    isLoading: isLoadingLatestHistory,
    error: latestHistoryError,
  } = useGetMessageHistoryQuery(
    { chatId, limit: MESSAGE_PAGE_SIZE, aroundId: focusMessageId || firstUnreadMessageId || undefined },
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

  // One page of history over HTTP. A failure is shown here (401 and 403 also leave the chat) and answers null.
  const fetchHistoryPage = useCallback(async (request: HistoryRequest): Promise<MessageHistoryResponse | null> => {
    try {
      const response = await authFetch(apiUrl(historyPath(chatId, request)));
      if (response.ok) return toHistoryResponse(await response.json(), historyDirection(request));
      if (response.status === 401) {
        setModal({ type: 'error', message: translationsRef.current.loginRequired });
        setTimeout(() => onBackRef.current(), 2000);
        return null;
      }
      if (response.status === 403) {
        onBackRef.current();
        return null;
      }
    } catch {
      // Shown below like any other failed page.
    }
    setModal({ type: 'error', message: translationsRef.current.errorLoadingMessages });
    return null;
  }, [chatId, onBackRef, setModal, translationsRef]);

  const loadOlderMessages = useCallback(async () => {
    if (!token || !oldestMessageId || !hasMoreMessages || isLoadingOlderMessagesRef.current || isReplacingWindowRef.current) return;
    const version = windowVersionRef.current;
    isLoadingOlderMessagesRef.current = true;
    setIsLoadingOlderMessages(true);
    try {
      const data = await fetchHistoryPage({ limit: MESSAGE_PAGE_SIZE, before: oldestMessageId });
      if (!data || version !== windowVersionRef.current) return;
      const olderMessages = normalizeHistoryMessages(data.history);
      setMessages((previous) => prependUniqueMessages(previous, olderMessages));
      trimNewestPendingRef.current = true;
      setHasMoreMessages(data.has_more_before ?? data.has_more);
      if (olderMessages.length > 0) setOldestMessageId(olderMessages[0].id);
    } finally {
      isLoadingOlderMessagesRef.current = false;
      setIsLoadingOlderMessages(false);
    }
  }, [fetchHistoryPage, hasMoreMessages, oldestMessageId, setMessages, token]);

  const loadNewerMessages = useCallback(async () => {
    if (!token || !newestMessageId || !hasMoreNewerMessages || isLoadingNewerMessagesRef.current || isReplacingWindowRef.current) return;
    const version = windowVersionRef.current;
    isLoadingNewerMessagesRef.current = true;
    setIsLoadingNewerMessages(true);
    try {
      const data = await fetchHistoryPage({ limit: MESSAGE_PAGE_SIZE, after: newestMessageId });
      if (!data || version !== windowVersionRef.current) return;
      const newerMessages = normalizeHistoryMessages(data.history);
      setMessages((previous) => appendUniqueMessages(previous, newerMessages));
      setHasMoreNewerMessages(!!data.has_more_after);
      if (newerMessages.length > 0) setNewestMessageId(newerMessages[newerMessages.length - 1].id);
    } finally {
      isLoadingNewerMessagesRef.current = false;
      setIsLoadingNewerMessages(false);
    }
  }, [fetchHistoryPage, hasMoreNewerMessages, newestMessageId, setMessages, token]);

  // Replaces the loaded window with one page: the newest one, or the one around a message. Messages still
  // being sent stay. The latest call wins when several overlap (quick jumps between search results).
  const replaceWindow = useCallback(async (around?: Id) => {
    if (!token || !isServerId(chatId)) return;
    windowVersionRef.current += 1;
    const version = windowVersionRef.current;
    isReplacingWindowRef.current = true;
    setIsLoadingNewerMessages(true);
    try {
      const data = await fetchHistoryPage({ limit: MESSAGE_PAGE_SIZE, around });
      if (!data || version !== windowVersionRef.current) return;
      const pageMessages = normalizeHistoryMessages(data.history);
      setMessages((previous) => [...pageMessages, ...previous.filter((message) => isLocalId(message.id))]);
      setOldestMessageId(pageMessages[0]?.id || null);
      setNewestMessageId(pageMessages[pageMessages.length - 1]?.id || null);
      setHasMoreMessages(data.has_more_before ?? data.has_more);
      setHasMoreNewerMessages(!!data.has_more_after);
    } finally {
      if (version === windowVersionRef.current) {
        isReplacingWindowRef.current = false;
        setIsLoadingNewerMessages(false);
      }
    }
  }, [chatId, fetchHistoryPage, setMessages, token]);

  // Used when the newest messages were never loaded.
  const loadLatestMessages = useCallback(() => replaceWindow(), [replaceWindow]);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const isLoadingLatestHistoryRef = useRef(isLoadingLatestHistory);
  isLoadingLatestHistoryRef.current = isLoadingLatestHistory;

  // Makes sure a message is in the loaded window, e.g. to jump to it: if it is not, the window is replaced
  // with the page around it. The first page is already the one around the focused message.
  const ensureMessageLoaded = useCallback(async (messageId: Id) => {
    if (!isServerId(messageId) || messagesRef.current.some((message) => message.id === messageId)) return;
    if (messageId === focusMessageId && isLoadingLatestHistoryRef.current) return;
    await replaceWindow(messageId);
  }, [focusMessageId, replaceWindow]);

  const hasMoreNewerMessagesRef = useRef(hasMoreNewerMessages);
  hasMoreNewerMessagesRef.current = hasMoreNewerMessages;

  const chatIdRef = useRef(chatId);
  chatIdRef.current = chatId;

  // Loads messages sent while the socket was down. If the user is reading older history the newer pages
  // load on scroll anyway; otherwise fetch everything after the newest loaded message. If that keeps
  // failing, the missed messages are left to the normal load-newer-on-scroll path.
  const catchUpAfterReconnect = useCallback(async () => {
    if (!token || !isServerId(chatId) || hasMoreNewerMessagesRef.current || isLoadingNewerMessagesRef.current || isReplacingWindowRef.current) return;
    const version = windowVersionRef.current;
    const newestLoadedId = maxId(messagesRef.current.map((message) => message.id).filter(isServerId));
    if (!newestLoadedId) return;
    const isCurrent = () => chatIdRef.current === chatId;
    isLoadingNewerMessagesRef.current = true;
    try {
      const data = await fetchMissedMessages(chatId, newestLoadedId, MESSAGE_PAGE_SIZE, isCurrent);
      if (!isCurrent() || version !== windowVersionRef.current) return;
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

  const { markMessagesRead, applyReadReceiptBatch } = useOwnReadReceipts({ chatId, username, currentUserIdRef, setMessages });

  return {
    isLoadingInitialMessages,
    isLoadingOlderMessages,
    isLoadingNewerMessages,
    hasMoreMessages,
    hasMoreNewerMessages,
    loadOlderMessages,
    loadNewerMessages,
    loadLatestMessages,
    ensureMessageLoaded,
    catchUpAfterReconnect,
    markMessagesRead,
    applyReadReceiptBatch,
  };
};
