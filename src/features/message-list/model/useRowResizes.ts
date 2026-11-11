import { MutableRefObject, RefObject, useEffect, useRef } from 'react';
import type { Message } from '@/entities/message';
import { syncObservedRows } from './rowObservation';

const RENDER_AHEAD_MARGIN = '150% 0px';

interface RowObserverOptions {
  chatContainerRef: RefObject<HTMLDivElement | null>;
  messageRefs: MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  messages: Message[];
  onResize: () => void;
}

export const useRowResizes = ({ chatContainerRef, messageRefs, messages, onResize }: RowObserverOptions) => {
  const resizeRef = useRef<ResizeObserver | null>(null);
  const nearRef = useRef<IntersectionObserver | null>(null);
  const rowsRef = useRef(new Map<Element, string>());

  useEffect(() => {
    const container = chatContainerRef.current;
    const rows = rowsRef.current;
    resizeRef.current = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onResize);
    nearRef.current = !container || typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.toggleAttribute('data-near', entry.isIntersecting));
    }, { root: container, rootMargin: RENDER_AHEAD_MARGIN });
    rows.clear();
    return () => {
      resizeRef.current?.disconnect();
      nearRef.current?.disconnect();
      resizeRef.current = null;
      nearRef.current = null;
      rows.clear();
    };
  }, [chatContainerRef, onResize]);

  useEffect(() => {
    syncObservedRows(messageRefs.current, rowsRef.current, (element) => {
      resizeRef.current?.observe(element, { box: 'border-box' });
      nearRef.current?.observe(element);
    }, (element) => {
      resizeRef.current?.unobserve(element);
      nearRef.current?.unobserve(element);
    });
  }, [messages, messageRefs, onResize]);
};
