import { MutableRefObject, RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { Message } from '@/entities/message';
import { useLatestRef } from '@/shared/lib/useLatestRef';
import type { Id } from '@/shared/lib/ids';

interface ScrollToBottomOptions {
  chatContainerRef: RefObject<HTMLDivElement | null>;
  messageRefs: MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  messages: Message[];
  isPositioned: boolean;
  hasMoreNewerMessages: boolean;
  onLoadLatestMessages?: () => Promise<void>;
  scrollToBottomKey?: string | number;
  isOwnMessage: (message: Message) => boolean;
  shouldStickToBottomRef: MutableRefObject<boolean>;
  autoScrollUntilRef: MutableRefObject<number>;
}

export const getScrollBehavior = (): ScrollBehavior => (
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
);

const distanceFromBottom = (container: HTMLElement) => (
  container.scrollHeight - container.scrollTop - container.clientHeight
);

// State of the "scroll to bottom" button: whether it is shown, the unseen live-message badge, and where it scrolls to.
export const useScrollToBottom = ({
  chatContainerRef, messageRefs, messages, isPositioned, hasMoreNewerMessages, onLoadLatestMessages,
  scrollToBottomKey, isOwnMessage, shouldStickToBottomRef, autoScrollUntilRef,
}: ScrollToBottomOptions) => {
  const [unseenIds, setUnseenIds] = useState<Id[]>([]);
  const [isFarFromBottom, setIsFarFromBottom] = useState(false);
  const countedIdsRef = useRef<Set<Id>>(new Set());
  const hasMoreNewerMessagesRef = useLatestRef(hasMoreNewerMessages);
  const onLoadLatestMessagesRef = useLatestRef(onLoadLatestMessages);
  const isOwnMessageRef = useLatestRef(isOwnMessage);

  useEffect(() => {
    setUnseenIds([]);
    setIsFarFromBottom(false);
    countedIdsRef.current = new Set();
  }, [scrollToBottomKey]);

  const updateDistance = useCallback(() => {
    const container = chatContainerRef.current;
    if (container) setIsFarFromBottom(distanceFromBottom(container) > container.clientHeight);
  }, [chatContainerRef]);

  useEffect(updateDistance, [updateDistance, messages, isPositioned]);

  const clearUnseen = useCallback(() => setUnseenIds((ids) => (ids.length ? [] : ids)), []);

  // Only messages that arrived over the socket count, and each id counts once.
  const countIncoming = useCallback((appended: Message[]) => {
    const incoming = appended.filter((item) => (
      item.is_live && !isOwnMessageRef.current(item) && !countedIdsRef.current.has(item.id)
    ));
    if (incoming.length === 0) return;
    incoming.forEach((item) => countedIdsRef.current.add(item.id));
    setUnseenIds((ids) => [...ids, ...incoming.map((item) => item.id)]);
  }, [isOwnMessageRef]);

  // Messages count as seen once they are visible, not when the scroll position hits an exact pixel.
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container || unseenIds.length === 0 || typeof IntersectionObserver === 'undefined') return;
    const elementIds = new Map<Element, Id>();
    const observer = new IntersectionObserver((entries) => {
      const seen = new Set<Id>();
      entries.forEach((entry) => {
        const id = elementIds.get(entry.target);
        if (entry.isIntersecting && id !== undefined) seen.add(id);
      });
      if (seen.size > 0) setUnseenIds((ids) => ids.filter((id) => !seen.has(id)));
    }, { root: container, threshold: 0.6, rootMargin: '0px 0px -120px 0px' });
    unseenIds.forEach((id) => {
      const element = messageRefs.current[id];
      if (!element) return;
      elementIds.set(element, id);
      observer.observe(element);
    });
    return () => observer.disconnect();
  }, [unseenIds, messageRefs, chatContainerRef]);

  const scrollToBottom = useCallback(async () => {
    const container = chatContainerRef.current;
    if (!container) return;
    shouldStickToBottomRef.current = true;
    autoScrollUntilRef.current = Date.now() + 800;
    if (hasMoreNewerMessagesRef.current && onLoadLatestMessagesRef.current) {
      // The newest messages are not loaded: replace the window with the latest page, then jump to its end.
      await onLoadLatestMessagesRef.current();
      shouldStickToBottomRef.current = true;
      const jump = () => {
        const next = chatContainerRef.current;
        if (next) next.scrollTop = next.scrollHeight;
      };
      requestAnimationFrame(() => {
        jump();
        requestAnimationFrame(jump);
      });
      return;
    }
    container.scrollTo({ top: container.scrollHeight, behavior: getScrollBehavior() });
  }, [chatContainerRef, shouldStickToBottomRef, autoScrollUntilRef, hasMoreNewerMessagesRef, onLoadLatestMessagesRef]);

  return {
    unseenCount: unseenIds.length,
    showScrollToBottom: isPositioned && (isFarFromBottom || hasMoreNewerMessages),
    scrollToBottom,
    countIncoming,
    clearUnseen,
    updateDistance,
  };
};

