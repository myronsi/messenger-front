import type { EntityId } from '@/shared/api/entityId';
import { MutableRefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Message } from '@/entities/message';
import { useLatestRef } from '@/shared/lib/useLatestRef';
import { useRowResizes } from './useRowResizes';
import { getAppendedMessages } from '@/entities/message';
import { useStickyDateBadge } from './useStickyDateBadge';
import { useHighlightScroll } from './useHighlightScroll';
import { useScrollToBottom } from './useScrollToBottom';
import { listenForScrollIntent } from './scrollIntent';
import { EMPTY_LAYOUT, keepRowsInPlace, measureRowLayout, type RowLayout } from './scrollAnchor';
import { maxScrollTop, useScrollAnimation } from './smoothScroll';
import { prefetchPages } from './prefetchPages';
import { useBottomInset } from './useBottomInset';

interface MessageListScrollOptions {
  messages: Message[];
  messageRefs: MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  firstUnreadMessageId?: EntityId | null;
  highlightedMessageId: EntityId | null;
  tempHighlightedMessageId: EntityId | null;
  getFormattedDateLabel: (timestamp: string) => string;
  hasMoreMessages: boolean;
  hasMoreNewerMessages: boolean;
  isLoadingInitialMessages: boolean;
  isLoadingOlderMessages: boolean;
  isLoadingNewerMessages: boolean;
  onLoadOlderMessages?: () => Promise<void>;
  onLoadNewerMessages?: () => Promise<void>;
  onLoadLatestMessages?: () => Promise<void>;
  onLoadMessagesAround?: (messageId: EntityId) => Promise<void>;
  onScrollStart?: () => void;
  scrollToBottomKey?: string | number;
  isOwnMessage: (message: Message) => boolean;
  bottomInsetSource?: HTMLElement | null;
}

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
  const isAnchoringRef = useRef(() => hasScrolledInitialRef.current && !settleRef.current && !shouldStickToBottomRef.current);
  const latest = useLatestRef(options);
  const isOwnMessageRef = useLatestRef(isOwnMessage);
  const messagesRef = useLatestRef(messages);

  const keepVisibleRows = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return null;
    const result = isAnchoringRef.current() ? keepRowsInPlace(container, rowLayoutRef.current) : null;
    const rows = messagesRef.current.map((message) => messageRefs.current[message.id]).filter((row): row is HTMLDivElement => !!row);
    rowLayoutRef.current = measureRowLayout(container, rows);
    return result;
  }, [messageRefs, messagesRef]);
  useRowResizes({ chatContainerRef, messageRefs, messages, onResize: keepVisibleRows });
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
    scrollToBottomKey, isOwnMessage, shouldStickToBottomRef, pendingBottomRef, glideToBottom,
  });
  useBottomInset(contentRef, options.bottomInsetSource);
  const { label: currentDate, badgeRef: dateBadgeRef } = useStickyDateBadge({ chatContainerRef, active: isScrolling, contentKey: messages });

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
  }, [messages, isLoadingOlderMessages, isLoadingNewerMessages, isLoadingInitialMessages, keepVisibleRows, glideToBottom]);

  useHighlightScroll({
    targetId: tempHighlightedMessageId ?? highlightedMessageId, messages, messageRefs, hasMoreMessages,
    isLoadingOlderMessages, onLoadOlderMessages, chatContainerRef, startAnimation, replacedWindowRef,
    hasMoreNewerMessages, isLoadingNewerMessages, onLoadNewerMessages: options.onLoadNewerMessages,
    onLoadMessagesAround: options.onLoadMessagesAround,
  });

  const jumpTargetId = tempHighlightedMessageId ?? highlightedMessageId;
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
    shouldStickToBottomRef.current = true;
    lastMessageIdRef.current = null;
    previousMessagesRef.current = [];
    pendingBottomRef.current = false;
    replacedWindowRef.current = null;
    settleRef.current = null;
    cancelAnimationFrame(positionedFrameRef.current);
    setIsPositioned(false);
  }, [scrollToBottomKey, stopAnimation]);

  useEffect(() => () => cancelAnimationFrame(positionedFrameRef.current), []);

  useEffect(() => {
    if (!isLoadingInitialMessages && messages.length === 0) setIsPositioned(true);
  }, [isLoadingInitialMessages, messages.length, scrollToBottomKey]);

  const scrollFirstUnreadIntoView = useCallback(() => {
    const targetElement = firstUnreadMarkerRef.current || (visibleFirstUnreadId ? messageRefs.current[visibleFirstUnreadId] : null);
    if (!targetElement) return false;
    const container = chatContainerRef.current;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const targetRect = targetElement.getBoundingClientRect();
      const desiredTop = (container.clientHeight - targetRect.height) / 2;
      container.scrollTop += targetRect.top - containerRect.top - desiredTop;
    } else {
      targetElement.scrollIntoView({ block: 'center' });
    }
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
      current.onScrollStart?.();
      updateDistance();
      const movedByUser = Date.now() - lastUserInputAtRef.current < USER_SCROLL_WINDOW_MS;
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      const jumping = (current.tempHighlightedMessageId ?? current.highlightedMessageId) != null;
      if (distanceFromBottom <= BOTTOM_TOLERANCE && !pendingBottomRef.current && (movedByUser || !jumping)) {
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
  }, [latest, updateDistance, clearUnseen, isAnimatingRef]);

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
    if (!container || !lastMessageId) {
      lastMessageIdRef.current = lastMessageId;
      return;
    }
    if (!hasScrolledInitialRef.current && visibleFirstUnreadId &&
        !messageRefs.current[visibleFirstUnreadId] && hasMoreMessages) {
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
        shouldStickToBottomRef.current = true;
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
      const lastIsOwn = isOwnMessageRef.current(messages[messages.length - 1]);
      if (appended.length > 0 && lastIsOwn) {
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
    isOwnMessageRef, startAnimation, stopAnimation]);

  return {
    currentDate, dateBadgeRef, isScrolling, visibleFirstUnreadId, setVisibleFirstUnreadId, chatContainerRef, contentRef, firstUnreadMarkerRef,
    isPositioned, unseenCount, showScrollToBottom, scrollToBottom,
  };
};
