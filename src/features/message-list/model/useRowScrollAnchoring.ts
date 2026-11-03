import { MutableRefObject, RefObject, useEffect, useRef } from 'react';
import type { Message } from '@/entities/message';

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

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const heights = new WeakMap<Element, number>();
    const observer = new ResizeObserver((entries) => {
      const viewportTop = container.getBoundingClientRect().top;
      let shift = 0;
      for (const entry of entries) {
        const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        const previous = heights.get(entry.target);
        heights.set(entry.target, height);
        if (previous === undefined || previous === height) continue;
        if (entry.target.getBoundingClientRect().top < viewportTop) shift += height - previous;
      }
      if (shift && !shouldStickToBottomRef.current && !isRestoringScrollRef.current) container.scrollTop += shift;
    });
    observerRef.current = observer;
    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [chatContainerRef, shouldStickToBottomRef, isRestoringScrollRef]);

  useEffect(() => {
    const observer = observerRef.current;
    if (!observer) return;
    Object.values(messageRefs.current).forEach((element) => {
      if (element) observer.observe(element, { box: 'border-box' });
    });
  }, [messages, messageRefs]);
};
