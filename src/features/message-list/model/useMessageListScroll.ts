import { MutableRefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Message } from '@/entities/message';
import { getAppendedMessages, isValidTimestamp } from '@/entities/message';

interface MessageListScrollOptions {
  messages: Message[];
  messageRefs: MutableRefObject<{ [key: number]: HTMLDivElement | null }>;
  firstUnreadMessageId?: number | null;
  highlightedMessageId: number | null;
  tempHighlightedMessageId: number | null;
  getFormattedDateLabel: (timestamp: string) => string;
  hasMoreMessages: boolean;
  hasMoreNewerMessages: boolean;
  isLoadingInitialMessages: boolean;
  isLoadingOlderMessages: boolean;
  isLoadingNewerMessages: boolean;
  onLoadOlderMessages?: () => Promise<void>;
  onLoadNewerMessages?: () => Promise<void>;
  onScrollStart?: () => void;
  scrollToBottomKey?: string | number;
  isOwnMessage: (message: Message) => boolean;
}

const BOTTOM_TOLERANCE = 4;

export const useMessageListScroll = ({
  messages,
  messageRefs,
  firstUnreadMessageId,
  highlightedMessageId,
  tempHighlightedMessageId,
  getFormattedDateLabel,
  hasMoreMessages,
  hasMoreNewerMessages,
  isLoadingInitialMessages,
  isLoadingOlderMessages,
  isLoadingNewerMessages,
  onLoadOlderMessages,
  onLoadNewerMessages,
  onScrollStart,
  scrollToBottomKey,
  isOwnMessage,
}: MessageListScrollOptions) => {
  const [currentDate, setCurrentDate] = useState<string | null>(null);
  const [visibleFirstUnreadId, setVisibleFirstUnreadId] = useState<number | null>(firstUnreadMessageId ?? null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const firstUnreadMarkerRef = useRef<HTMLDivElement | null>(null);
  const isRestoringScrollRef = useRef(false);
  const hasScrolledInitialRef = useRef(false);
  const hasScrolledToFirstUnreadRef = useRef(false);
  const isSeekingFirstUnreadRef = useRef(false);
  const shouldStickToBottomRef = useRef(true);
  const lastMessageIdRef = useRef<number | null>(null);
  const scrollAnimationFrameRef = useRef<number | null>(null);
  const previousScrollHeightRef = useRef(0);
  const [isPositioned, setIsPositioned] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);
  const positionedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoScrollUntilRef = useRef(0);
  const isOwnMessageRef = useRef(isOwnMessage);
  isOwnMessageRef.current = isOwnMessage;
  const previousMessagesRef = useRef<Message[]>([]);

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
    if (positionedTimeoutRef.current) clearTimeout(positionedTimeoutRef.current);
    setIsPositioned(false);
    setUnseenCount(0);
  }, [scrollToBottomKey]);

  useEffect(() => () => {
    if (positionedTimeoutRef.current) clearTimeout(positionedTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (!isLoadingInitialMessages && messages.length === 0) setIsPositioned(true);
  }, [isLoadingInitialMessages, messages.length, scrollToBottomKey]);

  const scrollToBottom = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    shouldStickToBottomRef.current = true;
    autoScrollUntilRef.current = Date.now() + 800;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, []);

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
    const targetId = tempHighlightedMessageId ?? highlightedMessageId;
    if (!targetId) return;
    const targetElement = messageRefs.current[targetId];
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (hasMoreMessages && !isLoadingOlderMessages && onLoadOlderMessages) {
      onLoadOlderMessages();
    }
  }, [hasMoreMessages, highlightedMessageId, isLoadingOlderMessages, messageRefs, onLoadOlderMessages, tempHighlightedMessageId, messages]);

  useEffect(() => {
    if (!visibleFirstUnreadId || isLoadingInitialMessages || hasScrolledToFirstUnreadRef.current) return;
    if (messageRefs.current[visibleFirstUnreadId]) {
      requestAnimationFrame(scrollFirstUnreadIntoView);
    } else if (hasMoreMessages && !isLoadingOlderMessages && onLoadOlderMessages && !isSeekingFirstUnreadRef.current) {
      isSeekingFirstUnreadRef.current = true;
      onLoadOlderMessages().finally(() => { isSeekingFirstUnreadRef.current = false; });
    }
  }, [hasMoreMessages, isLoadingInitialMessages, isLoadingOlderMessages, messageRefs, messages, onLoadOlderMessages, scrollFirstUnreadIntoView, visibleFirstUnreadId]);

  const updateCurrentDate = () => {
    const container = chatContainerRef.current;
    if (!container || messages.length === 0) {
      setCurrentDate(null);
      return;
    }
    let lastSeparatorDate: string | null = null;
    for (let index = 0; index < messages.length; index++) {
      const message = messages[index];
      const messageElement = messageRefs.current[message.id];
      if (!messageElement || !isValidTimestamp(message.timestamp)) continue;
      const isSeparator = index === 0 ||
        getFormattedDateLabel(message.timestamp) !== getFormattedDateLabel(messages[index - 1].timestamp);
      if (isSeparator && messageElement.offsetTop <= container.scrollTop) {
        lastSeparatorDate = getFormattedDateLabel(message.timestamp);
      } else if (messageElement.offsetTop > container.scrollTop) {
        break;
      }
    }
    const firstValidMessage = messages.find((message) => isValidTimestamp(message.timestamp));
    setCurrentDate(lastSeparatorDate || (firstValidMessage ? getFormattedDateLabel(firstValidMessage.timestamp) : null));
  };

  useEffect(() => {
    const handleScroll = async () => {
      onScrollStart?.();
      const container = chatContainerRef.current;
      if (container) {
        const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= BOTTOM_TOLERANCE;
        if (isAtBottom) {
          shouldStickToBottomRef.current = true;
          autoScrollUntilRef.current = 0;
          setUnseenCount(0);
        } else if (Date.now() > autoScrollUntilRef.current) {
          shouldStickToBottomRef.current = false;
        }
      }
      if (container && container.scrollTop <= 120 && hasMoreMessages && !isLoadingOlderMessages &&
          !isRestoringScrollRef.current && onLoadOlderMessages) {
        const previousScrollHeight = container.scrollHeight;
        const previousScrollTop = container.scrollTop;
        isRestoringScrollRef.current = true;
        await onLoadOlderMessages();
        requestAnimationFrame(() => {
          const nextContainer = chatContainerRef.current;
          if (nextContainer) nextContainer.scrollTop = nextContainer.scrollHeight - previousScrollHeight + previousScrollTop;
          isRestoringScrollRef.current = false;
        });
      }
      if (container && container.scrollHeight - container.scrollTop - container.clientHeight <= 160 &&
          hasMoreNewerMessages && !isLoadingNewerMessages && onLoadNewerMessages) {
        await onLoadNewerMessages();
      }
      setIsScrolling(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => setIsScrolling(false), 500);
      updateCurrentDate();
    };
    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      updateCurrentDate();
    }
    return () => {
      container?.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [messages, getFormattedDateLabel, hasMoreMessages, hasMoreNewerMessages, isLoadingOlderMessages, isLoadingNewerMessages, onLoadOlderMessages, onLoadNewerMessages, onScrollStart]);

  useLayoutEffect(() => {
    const container = chatContainerRef.current;
    const lastMessageId = messages[messages.length - 1]?.id || null;
    if (!container || !lastMessageId || isRestoringScrollRef.current) {
      previousScrollHeightRef.current = container?.scrollHeight || 0;
      lastMessageIdRef.current = lastMessageId;
      return;
    }
    const previousScrollHeight = previousScrollHeightRef.current;
    const scrollHeightDelta = container.scrollHeight - previousScrollHeight;
    const isSameLastMessage = lastMessageIdRef.current === lastMessageId;
    if (isSameLastMessage && scrollHeightDelta !== 0 && shouldStickToBottomRef.current) {
      container.scrollTop = container.scrollHeight;
    }
    if (!hasScrolledInitialRef.current && visibleFirstUnreadId &&
        !messageRefs.current[visibleFirstUnreadId] && hasMoreMessages) {
      shouldStickToBottomRef.current = false;
      previousScrollHeightRef.current = container.scrollHeight;
      lastMessageIdRef.current = lastMessageId;
      return;
    }
    if (!hasScrolledInitialRef.current) {
      const shouldPreferFirstUnread = !!visibleFirstUnreadId;
      const forceInitialScroll = () => {
        const nextContainer = chatContainerRef.current;
        if (!nextContainer || isRestoringScrollRef.current) return;
        if (hasScrolledInitialRef.current && !shouldStickToBottomRef.current && !visibleFirstUnreadId) return;
        if (visibleFirstUnreadId && scrollFirstUnreadIntoView()) return;
        if (shouldPreferFirstUnread) {
          shouldStickToBottomRef.current = false;
          return;
        }
        nextContainer.scrollTop = nextContainer.scrollHeight;
        shouldStickToBottomRef.current = true;
      };
      forceInitialScroll();
      let secondFrame = 0;
      const firstFrame = requestAnimationFrame(() => {
        forceInitialScroll();
        secondFrame = requestAnimationFrame(forceInitialScroll);
      });
      const settleTimeout = window.setTimeout(forceInitialScroll, 120);
      const mediaSettleTimeout = window.setTimeout(forceInitialScroll, 400);
      hasScrolledInitialRef.current = true;
      lastMessageIdRef.current = lastMessageId;
      previousMessagesRef.current = messages;
      if (positionedTimeoutRef.current) clearTimeout(positionedTimeoutRef.current);
      positionedTimeoutRef.current = setTimeout(() => setIsPositioned(true), 450);
      return () => {
        cancelAnimationFrame(firstFrame);
        cancelAnimationFrame(secondFrame);
        window.clearTimeout(settleTimeout);
        window.clearTimeout(mediaSettleTimeout);
      };
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
          nextContainer.scrollTo({ top: nextContainer.scrollHeight, behavior: 'smooth' });
          scrollAnimationFrameRef.current = null;
        });
      } else {
        const incoming = appended.filter((item) => !isOwnMessageRef.current(item)).length;
        if (incoming > 0) setUnseenCount((count) => count + incoming);
      }
    }
    previousMessagesRef.current = messages;
    lastMessageIdRef.current = lastMessageId;
    previousScrollHeightRef.current = container.scrollHeight;
    return () => {
      if (scrollAnimationFrameRef.current !== null) {
        cancelAnimationFrame(scrollAnimationFrameRef.current);
        scrollAnimationFrameRef.current = null;
      }
    };
  }, [messages, scrollToBottomKey, visibleFirstUnreadId, messageRefs, scrollFirstUnreadIntoView]);

  return {
    currentDate, isScrolling, visibleFirstUnreadId, setVisibleFirstUnreadId, chatContainerRef, firstUnreadMarkerRef,
    isPositioned, unseenCount, scrollToBottom,
  };
};
