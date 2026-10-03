import { MutableRefObject, useEffect, useRef } from 'react';
import { Message } from '@/entities/message';

interface HighlightScrollOptions {
  targetId: number | null;
  messages: Message[];
  messageRefs: MutableRefObject<{ [key: number]: HTMLDivElement | null }>;
  hasMoreMessages: boolean;
  isLoadingOlderMessages: boolean;
  onLoadOlderMessages?: () => Promise<void>;
  behavior: ScrollBehavior;
}

// Scrolls to a highlighted message once per request. If the message is not loaded yet, older pages are
// loaded until it appears or there is nothing left to load.
export const useHighlightScroll = ({
  targetId, messages, messageRefs, hasMoreMessages, isLoadingOlderMessages, onLoadOlderMessages, behavior,
}: HighlightScrollOptions) => {
  const requestRef = useRef<{ id: number; done: boolean } | null>(null);

  useEffect(() => {
    if (!targetId) {
      requestRef.current = null;
      return;
    }
    if (requestRef.current?.id !== targetId) requestRef.current = { id: targetId, done: false };
    const request = requestRef.current;
    if (request.done || messages.length === 0) return;
    const element = messageRefs.current[targetId];
    if (element) {
      request.done = true;
      element.scrollIntoView({ behavior, block: 'center' });
    } else if (!hasMoreMessages || !onLoadOlderMessages) {
      request.done = true;
    } else if (!isLoadingOlderMessages) {
      onLoadOlderMessages();
    }
  }, [targetId, messages, messageRefs, hasMoreMessages, isLoadingOlderMessages, onLoadOlderMessages, behavior]);
};

