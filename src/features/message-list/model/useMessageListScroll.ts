import { MutableRefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Message } from '@/entities/message';
import { useLatestRef } from '@/shared/lib/useLatestRef';
import { getAppendedMessages } from '@/entities/message';
import { useCurrentDateLabel } from './useCurrentDateLabel';
import { useHighlightScroll } from './useHighlightScroll';
import { getScrollBehavior, useScrollToBottom } from './useScrollToBottom';
import type { Id } from '@/shared/lib/ids';

interface MessageListScrollOptions {
  messages: Message[];
  messageRefs: MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  firstUnreadMessageId?: Id | null;
  highlightedMessageId: Id | null;
  tempHighlightedMessageId: Id | null;
  getFormattedDateLabel: (timestamp: string) => string;
  hasMoreMessages: boolean;
  hasMoreNewerMessages: boolean;
  isLoadingInitialMessages: boolean;
  isLoadingOlderMessages: boolean;
  isLoadingNewerMessages: boolean;
  onLoadOlderMessages?: () => Promise<void>;
  onLoadNewerMessages?: () => Promise<void>;
  onLoadLatestMessages?: () => Promise<void>;
  onScrollStart?: () => void;
  scrollToBottomKey?: string | number;
  isOwnMessage: (message: Message) => boolean;
}

const BOTTOM_TOLERANCE = 4;

export const useMessageListScroll = (options: MessageListScrollOptions) => {
  const {
    messages, messageRefs, firstUnreadMessageId, highlightedMessageId, tempHighlightedMessageId,
    getFormattedDateLabel, hasMoreMessages, hasMoreNewerMessages, isLoadingInitialMessages, isLoadingOlderMessages,
    onLoadOlderMessages, onLoadLatestMessages, scrollToBottomKey, isOwnMessage,
  } = options;
  const [visibleFirstUnreadId, setVisibleFirstUnreadId] = useState<Id | null>(firstUnreadMessageId ?? null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const firstUnreadMarkerRef = useRef<HTMLDivElement | null>(null);
  const isRestoringScrollRef = useRef(false);
  const hasScrolledInitialRef = useRef(false);
  const hasScrolledToFirstUnreadRef = useRef(false);
  const isSeekingFirstUnreadRef = useRef(false);
  const shouldStickToBottomRef = useRef(true);
  const lastMessageIdRef = useRef<Id | null>(null);
  const scrollAnimationFrameRef = useRef<number | null>(null);
  const positionedFrameRef = useRef(0);
  const autoScrollUntilRef = useRef(0);
  const settleRef = useRef<(() => void) | null>(null);
  const previousMessagesRef = useRef<Message[]>([]);
  const latest = useLatestRef(options);
  const isOwnMessageRef = useLatestRef(isOwnMessage);
  const { unseenCount, showScrollToBottom, scrollToBottom, countIncoming, clearUnseen, updateDistance } = useScrollToBottom({
    chatContainerRef, messageRefs, messages, isPositioned, hasMoreNewerMessages, onLoadLatestMessages,
    scrollToBottomKey, isOwnMessage, shouldStickToBottomRef, autoScrollUntilRef,
  });
  const currentDate = useCurrentDateLabel({ messages, messageRefs, chatContainerRef, getFormattedDateLabel });
  const stopFollowingBottom = useCallback(() => {
    shouldStickToBottomRef.current = false;
    autoScrollUntilRef.current = 0;
    settleRef.current = null;
    if (scrollAnimationFrameRef.current !== null) cancelAnimationFrame(scrollAnimationFrameRef.current);
    scrollAnimationFrameRef.current = null;
  }, []);
  useHighlightScroll({
    targetId: tempHighlightedMessageId ?? highlightedMessageId, messages, messageRefs, behavior: getScrollBehavior(),
    onScrollToTarget: stopFollowingBottom,
  });

  useLayoutEffect(() => {
    setVisibleFirstUnreadId(firstUnreadMessageId ?? null);
    if (!hasScrolledInitialRef.current) hasScrolledToFirstUnreadRef.current = false;
  }, [firstUnreadMessageId]);

  useEffect(() => {
    hasScrolledInitialRef.current = false;
    hasScrolledToFirstUnreadRef.current = false;
    isSeekingFirstUnreadRef.current = false;
    firstUnreadMarkerRef.current = null;
    shouldStickToBottomRef.current = true;
    lastMessageIdRef.current = null;
    previousMessagesRef.current = [];
    autoScrollUntilRef.current = 0;
    settleRef.current = null;
    cancelAnimationFrame(positionedFrameRef.current);
    setIsPositioned(false);
  }, [scrollToBottomKey]);

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

  // One listener for the lifetime of the list; the work is throttled to a frame and reads the latest props from a ref.
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    let frame = 0;
    const run = async () => {
      frame = 0;
      const current = latest.current;
      current.onScrollStart?.();
      updateDistance();
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      if (distanceFromBottom <= BOTTOM_TOLERANCE) {
        shouldStickToBottomRef.current = true;
        autoScrollUntilRef.current = 0;
        clearUnseen();
      } else if (Date.now() > autoScrollUntilRef.current) {
        shouldStickToBottomRef.current = false;
      }
      setIsScrolling(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => setIsScrolling(false), 500);
      if (container.scrollTop <= 120 && current.hasMoreMessages && !current.isLoadingOlderMessages &&
          !isRestoringScrollRef.current && current.onLoadOlderMessages) {
        const previousScrollHeight = container.scrollHeight;
        const previousScrollTop = container.scrollTop;
        isRestoringScrollRef.current = true;
        await current.onLoadOlderMessages();
        requestAnimationFrame(() => {
          container.scrollTop = container.scrollHeight - previousScrollHeight + previousScrollTop;
          isRestoringScrollRef.current = false;
        });
      }
      const latestProps = latest.current;
      const remaining = container.scrollHeight - container.scrollTop - container.clientHeight;
      if (remaining <= 160 && latestProps.hasMoreNewerMessages && !latestProps.isLoadingNewerMessages &&
          latestProps.onLoadNewerMessages) {
        await latestProps.onLoadNewerMessages();
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(() => { void run(); });
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [latest, updateDistance, clearUnseen]);

  // Keeps the view pinned to the bottom (or on the first unread message) while content such as images
  // finishes loading, until the user takes over by scrolling.
  useEffect(() => {
    const container = chatContainerRef.current;
    const content = contentRef.current;
    if (!container || !content || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (isRestoringScrollRef.current || !hasScrolledInitialRef.current) return;
      if (settleRef.current) {
        settleRef.current();
      } else if (shouldStickToBottomRef.current && Date.now() > autoScrollUntilRef.current) {
        container.scrollTop = container.scrollHeight;
      }
    });
    observer.observe(content);
    const stopSettling = () => { settleRef.current = null; };
    const userInput = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
    userInput.forEach((name) => container.addEventListener(name, stopSettling, { passive: true }));
    return () => {
      observer.disconnect();
      userInput.forEach((name) => container.removeEventListener(name, stopSettling));
    };
  }, []);

  useLayoutEffect(() => {
    const container = chatContainerRef.current;
    const lastMessageId = messages[messages.length - 1]?.id || null;
    if (!container || !lastMessageId || isRestoringScrollRef.current) {
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
        if (!nextContainer || isRestoringScrollRef.current) return;
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
      if (shouldStickToBottomRef.current || (appended.length > 0 && lastIsOwn)) {
        shouldStickToBottomRef.current = true;
        autoScrollUntilRef.current = Date.now() + 800;
        if (scrollAnimationFrameRef.current !== null) cancelAnimationFrame(scrollAnimationFrameRef.current);
        scrollAnimationFrameRef.current = requestAnimationFrame(() => {
          const nextContainer = chatContainerRef.current;
          if (!nextContainer || isRestoringScrollRef.current) return;
          nextContainer.scrollTo({ top: nextContainer.scrollHeight, behavior: getScrollBehavior() });
          scrollAnimationFrameRef.current = null;
        });
      } else {
        countIncoming(appended);
      }
    }
    previousMessagesRef.current = messages;
    lastMessageIdRef.current = lastMessageId;
    return () => {
      if (scrollAnimationFrameRef.current !== null) {
        cancelAnimationFrame(scrollAnimationFrameRef.current);
        scrollAnimationFrameRef.current = null;
      }
    };
  }, [messages, scrollToBottomKey, visibleFirstUnreadId, messageRefs, scrollFirstUnreadIntoView, countIncoming, hasMoreMessages, isOwnMessageRef]);

  return {
    currentDate, isScrolling, visibleFirstUnreadId, setVisibleFirstUnreadId, chatContainerRef, contentRef, firstUnreadMarkerRef,
    isPositioned, unseenCount, showScrollToBottom, scrollToBottom,
  };
};

