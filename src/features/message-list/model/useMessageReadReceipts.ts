import { isPersistedId } from '@/shared/api/entityId';
import type { EntityId } from '@/shared/api/entityId';
import { MutableRefObject, useEffect, useMemo, useRef } from 'react';
import { Message } from '@/entities/message';
import { useLatestRef } from '@/shared/lib/useLatestRef';
import { useStableCallback } from '@/shared/lib/useStableCallback';
import { isUnreadByMe, syncObservedRows, unreadVisibleMessageIds, type RowRefs } from './rowObservation';

interface MessageReadReceiptOptions {
  messages: Message[];
  userId: EntityId;
  messageRefs: MutableRefObject<RowRefs>;
  chatContainerRef: MutableRefObject<HTMLDivElement | null>;
  isOwnMessage: (message: Message) => boolean;
  onMarkMessagesRead?: (messageIds: EntityId[]) => Promise<void>;
  enabled?: boolean;
}

export const useMessageReadReceipts = ({
  messages,
  userId,
  messageRefs,
  chatContainerRef,
  isOwnMessage,
  onMarkMessagesRead,
  enabled = true,
}: MessageReadReceiptOptions) => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const rowsRef = useRef(new Map<Element, string>());
  const visibleRef = useRef(new Set<Element>());
  const sentReadReceiptsRef = useRef<Set<EntityId>>(new Set());
  const queuedReadReceiptsRef = useRef<Set<EntityId>>(new Set());
  const readFlushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMarkMessagesReadRef = useLatestRef(onMarkMessagesRead);
  const messagesById = useMemo(() => new Map(messages.map((message) => [String(message.id), message])), [messages]);

  const flushReadReceipts = useStableCallback(async () => {
    if (!onMarkMessagesReadRef.current || queuedReadReceiptsRef.current.size === 0) return;
    const messageIds = Array.from(queuedReadReceiptsRef.current);
    queuedReadReceiptsRef.current.clear();
    try {
      await onMarkMessagesReadRef.current(messageIds);
    } catch {
      messageIds.forEach((messageId) => sentReadReceiptsRef.current.delete(messageId));
    }
  });

  const queueVisible = useStableCallback((elements: Iterable<Element>) => {
    if (!onMarkMessagesReadRef.current || !isPersistedId(userId)) return;
    const ids = unreadVisibleMessageIds(elements, rowsRef.current, messagesById, (message) => isUnreadByMe(message, userId, isOwnMessage))
      .filter((messageId) => !sentReadReceiptsRef.current.has(messageId));
    if (ids.length === 0) return;
    ids.forEach((messageId) => {
      sentReadReceiptsRef.current.add(messageId);
      queuedReadReceiptsRef.current.add(messageId);
    });
    if (readFlushTimeoutRef.current) clearTimeout(readFlushTimeoutRef.current);
    readFlushTimeoutRef.current = setTimeout(() => {
      readFlushTimeoutRef.current = null;
      void flushReadReceipts();
    }, 500);
  });

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') return;
    const rows = rowsRef.current;
    const visible = visibleRef.current;
    const observer = new IntersectionObserver((entries) => {
      const entered: Element[] = [];
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          visible.delete(entry.target);
          return;
        }
        visible.add(entry.target);
        entered.push(entry.target);
      });
      if (entered.length) queueVisible(entered);
    }, { threshold: 0.5, root: chatContainerRef.current });
    observerRef.current = observer;
    return () => {
      observer.disconnect();
      observerRef.current = null;
      rows.clear();
      visible.clear();
    };
  }, [enabled, chatContainerRef, queueVisible]);

  useEffect(() => {
    const observer = observerRef.current;
    if (!observer) return;
    const visible = visibleRef.current;
    syncObservedRows(messageRefs.current, rowsRef.current, (element) => observer.observe(element), (element) => {
      observer.unobserve(element);
      visible.delete(element);
    });
    queueVisible(visible);
  }, [messagesById, messageRefs, enabled, userId, onMarkMessagesRead, queueVisible]);

  useEffect(() => () => {
    if (readFlushTimeoutRef.current) clearTimeout(readFlushTimeoutRef.current);
    void flushReadReceipts();
  }, [flushReadReceipts]);
};
