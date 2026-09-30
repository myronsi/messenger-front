import { MutableRefObject, useEffect, useRef } from 'react';
import { Message } from '@/entities/message';

interface MessageReadReceiptOptions {
  messages: Message[];
  username: string;
  userId: number;
  messageRefs: MutableRefObject<{ [key: number]: HTMLDivElement | null }>;
  chatContainerRef: MutableRefObject<HTMLDivElement | null>;
  isOwnMessage: (message: Message) => boolean;
  onMarkMessagesRead?: (messageIds: number[]) => Promise<void>;
  enabled?: boolean;
}

export const useMessageReadReceipts = ({
  messages,
  username,
  userId,
  messageRefs,
  chatContainerRef,
  isOwnMessage,
  onMarkMessagesRead,
  enabled = true,
}: MessageReadReceiptOptions) => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentReadReceiptsRef = useRef<Set<number>>(new Set());
  const queuedReadReceiptsRef = useRef<Set<number>>(new Set());
  const readFlushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMarkMessagesReadRef = useRef(onMarkMessagesRead);

  useEffect(() => {
    onMarkMessagesReadRef.current = onMarkMessagesRead;
  }, [onMarkMessagesRead]);

  const flushReadReceipts = async () => {
    if (!onMarkMessagesReadRef.current || queuedReadReceiptsRef.current.size === 0) return;
    const messageIds = Array.from(queuedReadReceiptsRef.current);
    queuedReadReceiptsRef.current.clear();
    try {
      await onMarkMessagesReadRef.current(messageIds);
    } catch {
      messageIds.forEach((messageId) => sentReadReceiptsRef.current.delete(messageId));
    }
  };

  const queueReadReceipt = (messageId: number) => {
    if (!onMarkMessagesReadRef.current || userId <= 0 || sentReadReceiptsRef.current.has(messageId)) return;
    sentReadReceiptsRef.current.add(messageId);
    queuedReadReceiptsRef.current.add(messageId);
    if (readFlushTimeoutRef.current) clearTimeout(readFlushTimeoutRef.current);
    readFlushTimeoutRef.current = setTimeout(() => {
      readFlushTimeoutRef.current = null;
      void flushReadReceipts();
    }, 500);
  };

  const isElementInViewport = (element: HTMLElement, container: HTMLElement | null) => {
    if (!container) return false;
    const rect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    return rect.top >= containerRect.top && rect.bottom <= containerRect.bottom &&
      rect.left >= containerRect.left && rect.right <= containerRect.right;
  };

  const markVisibleMessagesAsRead = () => {
    messages.forEach((message) => {
      if (isOwnMessage(message) || message.read_by?.some((reader) => reader.user_id === userId)) return;
      const element = messageRefs.current[message.id];
      if (element && isElementInViewport(element, chatContainerRef.current)) queueReadReceipt(message.id);
    });
  };

  useEffect(() => {
    observerRef.current?.disconnect();
    if (!enabled) return;
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const messageId = parseInt(entry.target.getAttribute('data-message-id') || '0');
        const message = messages.find((item) => item.id === messageId);
        if (message && !isOwnMessage(message) && !message.read_by?.some((reader) => reader.user_id === userId)) {
          queueReadReceipt(messageId);
        }
      });
    }, { threshold: 0.5, root: chatContainerRef.current });
    Object.values(messageRefs.current).forEach((element) => {
      if (element) {
        element.setAttribute('data-message-id', element.getAttribute('data-message-id') || '');
        observerRef.current?.observe(element);
      }
    });
    requestAnimationFrame(markVisibleMessagesAsRead);
    return () => observerRef.current?.disconnect();
  }, [messages, username, userId, messageRefs, enabled]);

  useEffect(() => () => {
    if (readFlushTimeoutRef.current) clearTimeout(readFlushTimeoutRef.current);
    void flushReadReceipts();
  }, []);

  return observerRef;
};
