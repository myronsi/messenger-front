import { MutableRefObject, useLayoutEffect, useRef } from 'react';
import { Message } from '@/entities/message';
import type { Id } from '@/shared/lib/ids';

interface HighlightScrollOptions {
  targetId: Id | null;
  messages: Message[];
  messageRefs: MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  behavior: ScrollBehavior;
  // Called right before the scroll, so the list stops following the bottom.
  onScrollToTarget: () => void;
}

// Scrolls to a highlighted message once per request, as soon as it is rendered. Loading it is the chat's job
// (the history around the message, see ensureMessageLoaded). A message that had to be loaded first is shown
// at once: a smooth scroll from the old position could pass the bottom of the new page and load newer pages.
export const useHighlightScroll = ({ targetId, messages, messageRefs, behavior, onScrollToTarget }: HighlightScrollOptions) => {
  const requestRef = useRef<{ id: Id; done: boolean; waited: boolean } | null>(null);

  useLayoutEffect(() => {
    if (!targetId) {
      requestRef.current = null;
      return;
    }
    if (requestRef.current?.id !== targetId) requestRef.current = { id: targetId, done: false, waited: false };
    const request = requestRef.current;
    if (request.done) return;
    const element = messageRefs.current[targetId];
    if (!element) {
      request.waited = true;
      return;
    }
    request.done = true;
    onScrollToTarget();
    element.scrollIntoView({ behavior: request.waited ? 'auto' : behavior, block: 'center' });
  }, [targetId, messages, messageRefs, behavior, onScrollToTarget]);
};
