import { MutableRefObject, RefObject, useEffect, useMemo, useState } from 'react';
import { Message, isValidTimestamp } from '@/entities/message';
import { useLatestRef } from '@/shared/lib/useLatestRef';
import type { Id } from '@/shared/lib/ids';

interface CurrentDateLabelOptions {
  messages: Message[];
  messageRefs: MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  chatContainerRef: RefObject<HTMLDivElement | null>;
  getFormattedDateLabel: (timestamp: string) => string;
}

// The label of the last date separator that has reached the top of the list. Separators are observed with an
// IntersectionObserver, so scrolling never measures or formats messages.
export const useCurrentDateLabel = ({ messages, messageRefs, chatContainerRef, getFormattedDateLabel }: CurrentDateLabelOptions) => {
  const [currentDate, setCurrentDate] = useState<string | null>(null);
  const getLabelRef = useLatestRef(getFormattedDateLabel);

  const separators = useMemo(() => {
    const result: { id: Id; label: string }[] = [];
    let previousLabel: string | null = null;
    for (const message of messages) {
      if (!isValidTimestamp(message.timestamp)) continue;
      const label = getLabelRef.current(message.timestamp);
      if (label !== previousLabel) result.push({ id: message.id, label });
      previousLabel = label;
    }
    return result;
  }, [messages, getLabelRef]);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container || separators.length === 0 || typeof IntersectionObserver === 'undefined') {
      setCurrentDate(separators[0]?.label ?? null);
      return;
    }
    const reachedTop = separators.map(() => false);
    const indexByElement = new Map<Element, number>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const index = indexByElement.get(entry.target);
        if (index === undefined) return;
        const rootTop = entry.rootBounds?.top ?? container.getBoundingClientRect().top;
        reachedTop[index] = entry.isIntersecting || entry.boundingClientRect.top <= rootTop;
      });
      let current = separators[0].label;
      for (let index = separators.length - 1; index >= 0; index--) {
        if (reachedTop[index]) {
          current = separators[index].label;
          break;
        }
      }
      setCurrentDate(current);
    }, { root: container, rootMargin: '0px 0px -99% 0px', threshold: 0 });
    separators.forEach((separator, index) => {
      const element = messageRefs.current[separator.id];
      if (!element) return;
      indexByElement.set(element, index);
      observer.observe(element);
    });
    setCurrentDate(separators[0].label);
    return () => observer.disconnect();
  }, [separators, messageRefs, chatContainerRef]);

  return currentDate;
};
