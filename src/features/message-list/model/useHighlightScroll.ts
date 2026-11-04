import type { EntityId } from '@/shared/api/entityId';
import { MutableRefObject, RefObject, useEffect, useRef } from 'react';
import { Message } from '@/entities/message';

const GLIDE_SHARE = 0.2;
const MIN_STEP = 2;
const MAX_GLIDE_MS = 1500;
const USER_INPUT = ['wheel', 'touchstart', 'pointerdown', 'keydown'];

interface HighlightScrollOptions {
  targetId: EntityId | null;
  messages: Message[];
  messageRefs: MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  hasMoreMessages: boolean;
  isLoadingOlderMessages: boolean;
  onLoadOlderMessages?: () => Promise<void>;
  behavior: ScrollBehavior;
  chatContainerRef: RefObject<HTMLDivElement | null>;
}

const distanceFromCenter = (container: HTMLElement, element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  return rect.top - container.getBoundingClientRect().top - (container.clientHeight - rect.height) / 2;
};

export const glideToCenter = (container: HTMLElement, element: HTMLElement, smooth: boolean) => {
  const startedAt = performance.now();
  let frame = 0;
  let stopped = false;
  const stop = () => {
    stopped = true;
    cancelAnimationFrame(frame);
    USER_INPUT.forEach((name) => container.removeEventListener(name, stop));
  };
  const step = () => {
    if (stopped) return;
    const distance = distanceFromCenter(container, element);
    const timedOut = performance.now() - startedAt > MAX_GLIDE_MS;
    const glide = Math.sign(distance) * Math.min(Math.abs(distance), Math.max(Math.abs(distance) * GLIDE_SHARE, MIN_STEP));
    const before = container.scrollTop;
    container.scrollTop = before + (smooth && !timedOut ? glide : distance);
    if (Math.abs(distance) < 1 || container.scrollTop === before || timedOut || !element.isConnected) {
      stop();
      return;
    }
    frame = requestAnimationFrame(step);
  };
  USER_INPUT.forEach((name) => container.addEventListener(name, stop, { passive: true }));
  frame = requestAnimationFrame(step);
  return stop;
};

// Scrolls to a highlighted message once per request. If the message is not loaded yet, older pages are
// loaded until it appears or there is nothing left to load.
export const useHighlightScroll = ({
  targetId, messages, messageRefs, hasMoreMessages, isLoadingOlderMessages, onLoadOlderMessages, behavior, chatContainerRef,
}: HighlightScrollOptions) => {
  const requestRef = useRef<{ id: EntityId; done: boolean } | null>(null);
  const stopGlideRef = useRef<(() => void) | null>(null);

  useEffect(() => () => stopGlideRef.current?.(), []);

  useEffect(() => {
    if (!targetId) {
      requestRef.current = null;
      return;
    }
    if (requestRef.current?.id !== targetId) requestRef.current = { id: targetId, done: false };
    const request = requestRef.current;
    if (request.done || messages.length === 0) return;
    const element = messageRefs.current[targetId];
    const container = chatContainerRef.current;
    if (element) {
      request.done = true;
      stopGlideRef.current?.();
      if (container) stopGlideRef.current = glideToCenter(container, element, behavior === 'smooth');
      else element.scrollIntoView({ behavior, block: 'center' });
    } else if (!hasMoreMessages || !onLoadOlderMessages) {
      request.done = true;
    } else if (!isLoadingOlderMessages) {
      onLoadOlderMessages();
    }
  }, [targetId, messages, messageRefs, hasMoreMessages, isLoadingOlderMessages, onLoadOlderMessages, behavior, chatContainerRef]);
};
