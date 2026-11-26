import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getAppendedMessages, type Message } from '@/entities/message';
import { useLatestRef } from '@/shared/lib/useLatestRef';
import { useRowResizes } from './useRowResizes';
import { useStickyDateBadge } from './useStickyDateBadge';
import { centeredScrollTop, useHighlightScroll } from './useHighlightScroll';
import { useScrollToBottom } from './useScrollToBottom';
import { listenForScrollIntent } from './scrollIntent';
import { EMPTY_LAYOUT, keepRowsInPlace, measureRowLayout, type RowLayout } from './scrollAnchor';
import { maxScrollTop, useScrollAnimation } from './smoothScroll';
import { prefetchPages } from './prefetchPages';
import { useBottomInset } from './useBottomInset';
import { useMessageWindow } from './useMessageWindow';
import type { MessageListScrollOptions } from './messageListScrollTypes';

const BOTTOM_TOLERANCE = 4;
const USER_SCROLL_WINDOW_MS = 1000;
const ARRIVAL_LEAD = 0.6;

export const useMessageListScroll = (options: MessageListScrollOptions) => {
  const {
    messages, messageRefs, firstUnreadMessageId, highlightedMessageId, tempHighlightedMessageId,
    hasMoreMessages, hasMoreNewerMessages, isLoadingInitialMessages, isLoadingOlderMessages, isLoadingNewerMessages,
    onLoadOlderMessages, onLoadLatestMessages, scrollToBottomKey, isOwnMessage,
  } = options;
  const [visibleFirstUnreadId, setVisibleFirstUnreadId] = useState<EntityId | null>(firstUnreadMessageId ?? null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const firstUnreadMarkerRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledInitialRef = useRef(false);
  const hasScrolledToFirstUnreadRef = useRef(false);
  const isSeekingFirstUnreadRef = useRef(false);
  const shouldStickToBottomRef = useRef(true);
  const lastMessageIdRef = useRef<EntityId | null>(null);
  const positionedFrameRef = useRef(0);
  const settleRef = useRef<(() => void) | null>(null);
  const lastUserInputAtRef = useRef(0);
  const previousMessagesRef = useRef<Message[]>([]);
  const renderedMessagesRef = useRef<Message[]>([]);
  const rowLayoutRef = useRef<RowLayout>(EMPTY_LAYOUT);
  const replacedWindowRef = useRef<Message[] | null>(null);
  const pendingBottomRef = useRef(false);
  const hadMoreNewerRef = useRef(hasMoreNewerMessages);
  const isAnchoringRef = useRef(() => hasScrolledInitialRef.current && !settleRef.current && !shouldStickToBottomRef.current);
  const latest = useLatestRef(options);
  const isOwnMessageRef = useLatestRef(isOwnMessage);
  const messagesRef = useLatestRef(messages);
  const jumpTargetId = tempHighlightedMessageId ?? highlightedMessageId;
  const isJumping = useCallback(() => (latest.current.tempHighlightedMessageId ?? latest.current.highlightedMessageId) != null, [latest]);
  const { messageWindow, sync: syncWindow } = useMessageWindow({ messages, messageRefs, containerRef: chatContainerRef,
    chatKey: scrollToBottomKey, focusIds: [jumpTargetId, isPositioned ? null : visibleFirstUnreadId] });
  const { renderKey, firstRendered } = messageWindow;

  const keepVisibleRows = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return null;
    const result = isAnchoringRef.current() ? keepRowsInPlace(container, rowLayoutRef.current) : null;
    const rows = messagesRef.current.map((message) => messageRefs.current[message.id]).filter((row): row is HTMLDivElement => !!row);
    rowLayoutRef.current = measureRowLayout(container, rows);
    syncWindow();
    return result;
  }, [messageRefs, messagesRef, syncWindow]);
  useRowResizes({ chatContainerRef, messageRefs, messages, onResize: keepVisibleRows, renderKey });
  const { startAnimation, stopAnimation, isAnimatingRef } = useScrollAnimation(chatContainerRef, keepVisibleRows);

  const glideToBottom = useCallback(() => {
    shouldStickToBottomRef.current = false;
    settleRef.current = null;
    startAnimation(() => (chatContainerRef.current ? maxScrollTop(chatContainerRef.current) : null), () => {
      shouldStickToBottomRef.current = true;
    });
  }, [startAnimation]);

  const { unseenCount, showScrollToBottom, scrollToBottom, countIncoming, clearUnseen, updateDistance } = useScrollToBottom({
    chatContainerRef, messageRefs, messages, isPositioned, hasMoreNewerMessages, onLoadLatestMessages,
    scrollToBottomKey, isOwnMessage, shouldStickToBottomRef, pendingBottomRef, glideToBottom, renderKey,
  });
  useBottomInset(contentRef, options.bottomInsetSource);
  const { label: currentDate, badgeRef: dateBadgeRef } = useStickyDateBadge({ chatContainerRef, active: isScrolling, contentKey: messages,
    fallbackLabel: firstRendered ? options.getFormattedDateLabel(firstRendered.timestamp) : null });

  useLayoutEffect(() => {
    const container = chatContainerRef.current;
    const messagesChanged = renderedMessagesRef.current !== messages;
    renderedMessagesRef.current = messages;
    const replaced = keepVisibleRows() === 'lost' && messagesChanged;
    if (replaced) replacedWindowRef.current = messages;
    if (!container || !messagesChanged || !pendingBottomRef.current || !hasScrolledInitialRef.current) return;
    pendingBottomRef.current = false;
    if (replaced) container.scrollTop = maxScrollTop(container) - container.clientHeight * ARRIVAL_LEAD;
    glideToBottom();
  }, [messages, isLoadingOlderMessages, isLoadingNewerMessages, isLoadingInitialMessages, keepVisibleRows, glideToBottom, renderKey]);

  useHighlightScroll({
    targetId: tempHighlightedMessageId ?? highlightedMessageId, messages, messageRefs, hasMoreMessages,
    isLoadingOlderMessages, onLoadOlderMessages, chatContainerRef, startAnimation, replacedWindowRef,
    hasMoreNewerMessages, isLoadingNewerMessages, onLoadNewerMessages: options.onLoadNewerMessages,
    onLoadMessagesAround: options.onLoadMessagesAround,
  });

  useLayoutEffect(() => {
    if (jumpTargetId == null) return;
    shouldStickToBottomRef.current = false;
    pendingBottomRef.current = false;
    settleRef.current = null;
  }, [jumpTargetId]);

  useLayoutEffect(() => {
    setVisibleFirstUnreadId(firstUnreadMessageId ?? null);
    if (!hasScrolledInitialRef.current) hasScrolledToFirstUnreadRef.current = false;
  }, [firstUnreadMessageId]);

  useLayoutEffect(() => {
    stopAnimation();
    hasScrolledInitialRef.current = false;
    hasScrolledToFirstUnreadRef.current = false;
    isSeekingFirstUnreadRef.current = false;
    firstUnreadMarkerRef.current = null;
    shouldStickToBottomRef.current = !isJumping();
    lastMessageIdRef.current = null;
    previousMessagesRef.current = [];
    pendingBottomRef.current = false;
    replacedWindowRef.current = null;
    settleRef.current = null;
    cancelAnimationFrame(positionedFrameRef.current);
    setIsPositioned(false);
  }, [scrollToBottomKey, stopAnimation, isJumping]);

  useEffect(() => () => cancelAnimationFrame(positionedFrameRef.current), []);

  useEffect(() => {
    if (!isLoadingInitialMessages && messages.length === 0) setIsPositioned(true);
  }, [isLoadingInitialMessages, messages.length, scrollToBottomKey]);

  const scrollFirstUnreadIntoView = useCallback(() => {
    const targetElement = firstUnreadMarkerRef.current || (visibleFirstUnreadId ? messageRefs.current[visibleFirstUnreadId] : null);
    if (!targetElement) return false;
    const container = chatContainerRef.current;
    if (container) container.scrollTop = centeredScrollTop(container, targetElement);
    else targetElement.scrollIntoView({ block: 'center' });
    shouldStickToBottomRef.current = false;
    hasScrolledInitialRef.current = true;
    hasScrolledToFirstUnreadRef.current = true;
    return true;
  }, [messageRefs, visibleFirstUnreadId]);

  useEffect(() => {
    if (!visibleFirstUnreadId || isLoadingInitialMessages || hasScrolledToFirstUnreadRef.current) return;
    if (messageRefs.current[visibleFirstUnreadId]) {
      requestAnimationFrame(scrollFirstUnreadIntoView);
    } else if (hasMoreMessages && !isLoadingOlderMessages && onLoadOlderMessages && !isSeekingFirstUnreadRef.current) {
      isSeekingFirstUnreadRef.current = true;
      void onLoadOlderMessages().finally(() => { isSeekingFirstUnreadRef.current = false; });
    }
  }, [
    hasMoreMessages, isLoadingInitialMessages, isLoadingOlderMessages, messageRefs, messages,
    onLoadOlderMessages, scrollFirstUnreadIntoView, visibleFirstUnreadId,
  ]);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    let frame = 0;
    const run = () => {
      frame = 0;
      const current = latest.current;
      const movedByUser = Date.now() - lastUserInputAtRef.current < USER_SCROLL_WINDOW_MS;
      if (movedByUser) current.onScrollStart?.();
      updateDistance();
      syncWindow();
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      const jumping = (current.tempHighlightedMessageId ?? current.highlightedMessageId) != null;
      const atNewest = !current.hasMoreNewerMessages;
      if (distanceFromBottom <= BOTTOM_TOLERANCE && atNewest && !pendingBottomRef.current && (movedByUser || !jumping)) {
        shouldStickToBottomRef.current = true;
        clearUnseen();
      } else if (movedByUser && !isAnimatingRef.current) {
        shouldStickToBottomRef.current = false;
      }
      setIsScrolling(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => setIsScrolling(false), 500);
      if (hasScrolledInitialRef.current && !pendingBottomRef.current) prefetchPages(container, current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(run);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [latest, updateDistance, clearUnseen, isAnimatingRef, syncWindow]);

  useEffect(() => {
    const container = chatContainerRef.current;
    const content = contentRef.current;
    if (!container || !content || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (!hasScrolledInitialRef.current) return;
      if (settleRef.current) settleRef.current();
      else if (shouldStickToBottomRef.current && !isAnimatingRef.current) container.scrollTop = container.scrollHeight;
      keepVisibleRows();
    });
    observer.observe(content, { box: 'border-box' });
    observer.observe(container);
    const stopInput = listenForScrollIntent(container, () => { settleRef.current = null; }, () => {
      lastUserInputAtRef.current = Date.now();
    });
    return () => { observer.disconnect(); stopInput(); };
  }, [isAnimatingRef, keepVisibleRows]);

  useLayoutEffect(() => {
    const container = chatContainerRef.current;
    const lastMessageId = messages[messages.length - 1]?.id || null;
    const loadedNewerPage = hadMoreNewerRef.current;
    hadMoreNewerRef.current = hasMoreNewerMessages;
    if (!container || !lastMessageId) {
      lastMessageIdRef.current = lastMessageId;
      return;
    }
    const onlyLocal = isLoadingInitialMessages && !messages.some((message) => isPersistedId(message.id));
    if (!hasScrolledInitialRef.current && (onlyLocal || (visibleFirstUnreadId && !messageRefs.current[visibleFirstUnreadId] && hasMoreMessages))) {
      shouldStickToBottomRef.current = false;
      lastMessageIdRef.current = lastMessageId;
      return;
    }
    if (!hasScrolledInitialRef.current) {
      const shouldPreferFirstUnread = !!visibleFirstUnreadId;
      const positionInitially = () => {
        const nextContainer = chatContainerRef.current;
        if (!nextContainer) return;
        if (visibleFirstUnreadId && scrollFirstUnreadIntoView()) return;
        if (shouldPreferFirstUnread) {
          shouldStickToBottomRef.current = false;
          return;
        }
        nextContainer.scrollTop = nextContainer.scrollHeight;
        shouldStickToBottomRef.current = !isJumping();
      };
      positionInitially();
      settleRef.current = shouldPreferFirstUnread ? positionInitially : null;
      hasScrolledInitialRef.current = true;
      lastMessageIdRef.current = lastMessageId;
      previousMessagesRef.current = messages;
      cancelAnimationFrame(positionedFrameRef.current);
      positionedFrameRef.current = requestAnimationFrame(() => {
        positionedFrameRef.current = requestAnimationFrame(() => setIsPositioned(true));
      });
      return;
    }
    if (lastMessageIdRef.current !== lastMessageId) {
      const appended = getAppendedMessages(previousMessagesRef.current, messages);
      const leftCache = previousMessagesRef.current.some(m => m.is_cached) && !messages.some(m => m.is_cached) && shouldStickToBottomRef.current;
      if ((appended.length > 0 && !loadedNewerPage && isOwnMessageRef.current(messages[messages.length - 1])) || leftCache) {
        stopAnimation();
        shouldStickToBottomRef.current = true;
        pendingBottomRef.current = false;
        settleRef.current = null;
        container.scrollTop = container.scrollHeight;
      } else if (shouldStickToBottomRef.current) {
        startAnimation(() => (chatContainerRef.current ? maxScrollTop(chatContainerRef.current) : null), () => {
          shouldStickToBottomRef.current = true;
        });
      } else {
        countIncoming(appended);
      }
    }
    previousMessagesRef.current = messages;
    lastMessageIdRef.current = lastMessageId;
  }, [messages, scrollToBottomKey, visibleFirstUnreadId, messageRefs, scrollFirstUnreadIntoView, countIncoming, hasMoreMessages,
    hasMoreNewerMessages, isOwnMessageRef, startAnimation, stopAnimation, isLoadingInitialMessages, isJumping]);

  return {
    currentDate, dateBadgeRef, isScrolling, visibleFirstUnreadId, setVisibleFirstUnreadId, chatContainerRef, contentRef, firstUnreadMarkerRef,
    isPositioned, unseenCount, showScrollToBottom, scrollToBottom, messageWindow,
  };
};
