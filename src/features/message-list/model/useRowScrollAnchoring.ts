import { MutableRefObject, RefObject, useEffect, useRef } from 'react';
import type { Message } from '@/entities/message';
import { syncObservedRows } from './rowObservation';

interface RowScrollAnchoringOptions {
  chatContainerRef: RefObject<HTMLDivElement | null>;
  messageRefs: MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  messages: Message[];
  shouldStickToBottomRef: MutableRefObject<boolean>;
  isRestoringScrollRef: MutableRefObject<boolean>;
}

export const useRowScrollAnchoring = ({
  chatContainerRef, messageRefs, messages, shouldStickToBottomRef, isRestoringScrollRef,
}: RowScrollAnchoringOptions) => {
  const observerRef = useRef<ResizeObserver | null>(null);
  const rowsRef = useRef(new Map<Element, string>());

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const heights = new WeakMap<Element, number>();
    const rows = rowsRef.current;
    const observer = new ResizeObserver((entries) => {
      let viewportTop: number | null = null;
      let shift = 0;
      for (const entry of entries) {
        const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        const previous = heights.get(entry.target);
        heights.set(entry.target, height);
        if (previous === undefined || previous === height) continue;
        viewportTop ??= container.getBoundingClientRect().top;
        if (entry.target.getBoundingClientRect().top < viewportTop) shift += height - previous;
      }
      if (shift && !shouldStickToBottomRef.current && !isRestoringScrollRef.current) container.scrollTop += shift;
    });
    observerRef.current = observer;
    rows.clear();
    return () => {
      observer.disconnect();
      observerRef.current = null;
      rows.clear();
    };
  }, [chatContainerRef, shouldStickToBottomRef, isRestoringScrollRef]);

  useEffect(() => {
    const observer = observerRef.current;
    if (!observer) return;
    syncObservedRows(messageRefs.current, rowsRef.current,
      (element) => observer.observe(element, { box: 'border-box' }), (element) => observer.unobserve(element));
  }, [messages, messageRefs]);
};
