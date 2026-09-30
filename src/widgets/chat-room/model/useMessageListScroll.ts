import { MutableRefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Message } from '@/entities/message';
import { parseUtcDate } from '@/shared/utils/dateFormatters';

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
}

const isValidTimestamp = (timestamp: string | undefined | null) => {
  if (!timestamp) return false;
  const date = parseUtcDate(timestamp);
  return !isNaN(date.getTime());
};

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

  useEffect(() => {
    setVisibleFirstUnreadId(firstUnreadMessageId ?? null);
    hasScrolledToFirstUnreadRef.current = false;
  }, [firstUnreadMessageId]);

  useEffect(() => {
    hasScrolledInitialRef.current = false;
    hasScrolledToFirstUnreadRef.current = false;
    isSeekingFirstUnreadRef.current = false;
    firstUnreadMarkerRef.current = null;
    shouldStickToBottomRef.current = true;
    lastMessageIdRef.current = null;
  }, [scrollToBottomKey]);

  const scrollFirstUnreadIntoView = useCallback(() => {
    const targetElement = firstUnreadMarkerRef.current || (visibleFirstUnreadId ? messageRefs.current[visibleFirstUnreadId] : null);
    if (!targetElement) return false;
    targetElement.scrollIntoView({ block: 'start' });
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
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 160;
        shouldStickToBottomRef.current = !visibleFirstUnreadId && isNearBottom;
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
      return () => {
        cancelAnimationFrame(firstFrame);
        cancelAnimationFrame(secondFrame);
        window.clearTimeout(settleTimeout);
        window.clearTimeout(mediaSettleTimeout);
      };
    }
    if (lastMessageIdRef.current !== lastMessageId && shouldStickToBottomRef.current) {
      if (scrollAnimationFrameRef.current !== null) cancelAnimationFrame(scrollAnimationFrameRef.current);
      scrollAnimationFrameRef.current = requestAnimationFrame(() => {
        const nextContainer = chatContainerRef.current;
        if (!nextContainer || isRestoringScrollRef.current) return;
        nextContainer.scrollTo({ top: nextContainer.scrollHeight, behavior: 'smooth' });
        scrollAnimationFrameRef.current = null;
      });
    }
    lastMessageIdRef.current = lastMessageId;
    previousScrollHeightRef.current = container.scrollHeight;
    return () => {
      if (scrollAnimationFrameRef.current !== null) {
        cancelAnimationFrame(scrollAnimationFrameRef.current);
        scrollAnimationFrameRef.current = null;
      }
    };
  }, [messages, scrollToBottomKey, visibleFirstUnreadId, messageRefs, scrollFirstUnreadIntoView]);

  return { currentDate, isScrolling, visibleFirstUnreadId, setVisibleFirstUnreadId, chatContainerRef, firstUnreadMarkerRef };
};
