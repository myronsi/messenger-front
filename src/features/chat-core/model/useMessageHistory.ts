import { isOffline } from '@/shared/lib/network';
import type { MessageHistoryResponse } from '@/entities/message';
import { isPersistedId, compareIds, type EntityId } from '@/shared/api/entityId';
import { mergeHistoryPages } from '@/shared/api/historySnapshotRules';
import { sessionScope } from '@/shared/api/indexedStore';
import type { Translations } from '@/shared/contexts/LanguageContext';
import { Dispatch, MutableRefObject, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Message, MESSAGE_HISTORY_FRESH_SECONDS, MESSAGE_PAGE_SIZE, MAX_LOADED_MESSAGES, appendUniqueMessages, joinAroundPage,
  mergeFreshHistoryMessages, normalizeHistoryMessages, prependOlderPage, sortMessages,
} from '@/entities/message';
import { asApiError } from '@/shared/lib/apiError';
import type { ShowError } from './types';
import { fetchMissedMessages } from './fetchMissedMessages';
import { useGetMessageHistoryQuery, useLazyGetMessageHistoryQuery, useLocalHistoryPage } from '@/entities/message';
import { useReadReceiptActions } from './useReadReceiptActions';
import { useHistorySnapshotSync } from './useHistorySnapshotSync';

export { MAX_LOADED_MESSAGES };

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
  const trimmedNewestIdRef = useRef<EntityId | null>(null);
  const { applyReadReceiptBatch, markMessagesRead } = useReadReceiptActions({ chatId, username, setMessages, currentUserIdRef });
  const [fetchHistory] = useLazyGetMessageHistoryQuery();
  const canLoad = token || (sessionScope() ? 'remembered' : '');
  const {
    currentData: latestHistory,
    isLoading: isLoadingLatestHistory,
    isFetching: isFetchingLatestHistory,
    error: latestHistoryError,
  } = useGetMessageHistoryQuery(
    { chatId, limit: MESSAGE_PAGE_SIZE, aroundId: firstUnreadMessageId || undefined },
    { skip: !canLoad || !isPersistedId(chatId), refetchOnMountOrArgChange: MESSAGE_HISTORY_FRESH_SECONDS, refetchOnFocus: true, refetchOnReconnect: true }
  );

  // A disk page is a preview. Keep it out of the live message store and out of pagination cursors.
  const historyStatus = asApiError(latestHistoryError).status;
  const hasLoadedMessages = messages.some(message => isPersistedId(message.id));
  const canPreview = isPersistedId(chatId) && !hasLoadedMessages && !(latestHistory && latestHistory.history.length === 0) &&
    historyStatus !== 401 && historyStatus !== 403 && historyStatus !== 404;
  const savedPage = useLocalHistoryPage(canPreview ? { chatId, limit: MESSAGE_PAGE_SIZE, aroundId: firstUnreadMessageId || undefined } : null);
  const savedPageRef = useRef<{ chatId: EntityId; page?: MessageHistoryResponse }>({ chatId });
  if (savedPageRef.current.chatId !== chatId || savedPage) savedPageRef.current = { chatId, page: savedPage };
  const preview = useMemo(
    () => canPreview && savedPage
      ? sortMessages([...normalizeHistoryMessages(savedPage.history).map((message) => ({ ...message, is_cached: true })), ...messages])
      : undefined,
    [canPreview, savedPage, messages],
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
    trimmedNewestIdRef.current = null;
  }, [chatId]);

  const applyTrimmedWindow = useCallback(() => {
    const newestId = trimmedNewestIdRef.current;
    if (newestId === null) return;
    trimmedNewestIdRef.current = null;
    setNewestMessageId(newestId);
    setHasMoreNewerMessages(true);
  }, []);

  useEffect(applyTrimmedWindow, [messages, applyTrimmedWindow]);

  const handleHistoryError = useCallback((error: unknown) => {
    const status = asApiError(error).status;
    if (status === 401) {
      setModal({ type: 'error', message: translationsRef.current.loginRequired });
      setTimeout(() => onBackRef.current(), 2000);
      return;
    }
    if (status === 403 || status === 404) {
      onBackRef.current();
      return;
    }
    if (isOffline()) return;
    setModal({ type: 'error', message: translationsRef.current.errorLoadingMessages });
  }, [onBackRef, setModal, translationsRef]);

  useEffect(() => {
    setIsLoadingInitialMessages(isLoadingLatestHistory && !hasLoadedMessages);
  }, [isLoadingLatestHistory, hasLoadedMessages]);

  useEffect(() => {
    if (!latestHistory) return;
    const page = mergeHistoryPages(savedPageRef.current.page, latestHistory, MAX_LOADED_MESSAGES);
    const nextMessages = normalizeHistoryMessages(page.history);
    const pageWindow = { hasMoreBefore: page.has_more_before ?? page.has_more, hasMoreAfter: !!page.has_more_after };
    setMessages((previous) => mergeFreshHistoryMessages(previous, nextMessages, pageWindow));
    setOldestMessageId(page.next_before_id ?? nextMessages[0]?.id ?? null);
    setNewestMessageId(page.next_after_id ?? nextMessages[nextMessages.length - 1]?.id ?? null);
    setHasMoreMessages(page.has_more_before ?? page.has_more);
    setHasMoreNewerMessages(!!page.has_more_after);
    setIsLoadingInitialMessages(false);
  }, [latestHistory, setMessages]);

  useEffect(() => {
    if (!latestHistoryError) return;
    if (historyStatus === 401 || historyStatus === 403 || historyStatus === 404 || (!preview && !hasLoadedMessages)) {
      handleHistoryError(latestHistoryError);
    }
    setIsLoadingInitialMessages(false);
  }, [latestHistoryError, handleHistoryError, historyStatus, preview, hasLoadedMessages]);

  const loadOlderMessages = useCallback(async () => {
    if (!canLoad || !oldestMessageId || !hasMoreMessages || isLoadingOlderMessagesRef.current) return;
    isLoadingOlderMessagesRef.current = true;
    setIsLoadingOlderMessages(true);
    try {
      const data = await fetchHistory({ chatId, limit: MESSAGE_PAGE_SIZE, beforeId: oldestMessageId }).unwrap();
      const olderMessages = normalizeHistoryMessages(data.history);
      setMessages(previous => {
        const page = prependOlderPage(previous, olderMessages, MAX_LOADED_MESSAGES);
        trimmedNewestIdRef.current = page.newestId;
        return page.messages;
      });
      applyTrimmedWindow();
      setHasMoreMessages(data.has_more_before ?? data.has_more);
      const nextOldestId = data.next_before_id ?? olderMessages[0]?.id;
      if (nextOldestId != null) setOldestMessageId(nextOldestId);
    } catch (error) {
      handleHistoryError(error);
    } finally {
      isLoadingOlderMessagesRef.current = false;
      setIsLoadingOlderMessages(false);
    }
  }, [fetchHistory, chatId, handleHistoryError, hasMoreMessages, oldestMessageId, setMessages, canLoad, applyTrimmedWindow]);

  const loadNewerMessages = useCallback(async () => {
    if (!canLoad || !newestMessageId || !hasMoreNewerMessages || isLoadingNewerMessagesRef.current) return;
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
  }, [fetchHistory, chatId, handleHistoryError, hasMoreNewerMessages, newestMessageId, setMessages, canLoad]);

  // Merge the newest page without discarding confirmed messages already in the shared cache.
  const loadLatestMessages = useCallback(async () => {
    if (!canLoad || !isPersistedId(chatId) || isLoadingNewerMessagesRef.current) return;
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
  }, [fetchHistory, chatId, handleHistoryError, setMessages, canLoad]);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const hasMoreNewerMessagesRef = useRef(hasMoreNewerMessages);
  hasMoreNewerMessagesRef.current = hasMoreNewerMessages;

  const chatIdRef = useRef(chatId);
  chatIdRef.current = chatId;
  const isFetchingLatestHistoryRef = useRef(isFetchingLatestHistory);
  isFetchingLatestHistoryRef.current = isFetchingLatestHistory;

  const loadMessagesAround = useCallback(async (messageId: EntityId) => {
    if (!canLoad || !isPersistedId(chatId) || !isPersistedId(messageId)) return;
    if (isLoadingOlderMessagesRef.current || isLoadingNewerMessagesRef.current) return;
    isLoadingOlderMessagesRef.current = true;
    isLoadingNewerMessagesRef.current = true;
    try {
      const data = await fetchHistory({ chatId, limit: MESSAGE_PAGE_SIZE, aroundId: messageId }).unwrap();
      const page = normalizeHistoryMessages(data.history);
      if (String(chatIdRef.current) !== String(chatId) || page.length === 0) return;
      const result = joinAroundPage(messagesRef.current, page, MAX_LOADED_MESSAGES);
      setMessages(result.messages);
      if (result.extendsOlder) {
        setOldestMessageId(data.next_before_id ?? page[0].id);
        setHasMoreMessages(data.has_more_before ?? data.has_more);
      }
      if (result.extendsNewer) {
        setNewestMessageId(data.next_after_id ?? page[page.length - 1].id);
        setHasMoreNewerMessages(Boolean(data.has_more_after));
      } else if (result.trimmedNewestId !== null) {
        setNewestMessageId(result.trimmedNewestId);
        setHasMoreNewerMessages(true);
      }
    } catch (error) {
      handleHistoryError(error);
    } finally {
      isLoadingOlderMessagesRef.current = false;
      isLoadingNewerMessagesRef.current = false;
    }
  }, [fetchHistory, chatId, handleHistoryError, setMessages, canLoad]);

  // Loads messages sent while the socket was down. If the user is reading older history the newer pages
  // load on scroll anyway; otherwise fetch everything after the newest loaded message. If that keeps
  // failing, the missed messages are left to the normal load-newer-on-scroll path.
  const catchUpAfterReconnect = useCallback(async (firstOpen = false) => {
    if (!canLoad || !isPersistedId(chatId) || hasMoreNewerMessagesRef.current || isLoadingNewerMessagesRef.current) return;
    if (firstOpen && isFetchingLatestHistoryRef.current) return;
    const newestLoadedId = messagesRef.current.reduce<EntityId>((newest, message) => compareIds(newest, message.id) > 0 ? newest : message.id, 0);
    if (!isPersistedId(newestLoadedId)) { if (!firstOpen) await loadLatestMessages(); return; }
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
  }, [fetchHistory, chatId, setMessages, canLoad, loadLatestMessages]);

  useHistorySnapshotSync({ chatId, messages, enabled: !preview && hasLoadedMessages && !hasMoreNewerMessages, hasMoreBefore: hasMoreMessages });
  const awaitingFirstPage = isPersistedId(chatId) && !hasLoadedMessages && !latestHistory && !latestHistoryError;
  return {
    preview,
    isLoadingInitialMessages: (isLoadingInitialMessages || awaitingFirstPage) && !preview,
    isLoadingOlderMessages,
    isLoadingNewerMessages,
    hasMoreMessages,
    hasMoreNewerMessages,
    loadOlderMessages,
    loadNewerMessages,
    loadLatestMessages,
    loadMessagesAround,
    catchUpAfterReconnect,
    markMessagesRead,
    applyReadReceiptBatch,
  };
};
