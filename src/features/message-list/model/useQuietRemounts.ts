import { MutableRefObject, useLayoutEffect, useRef } from 'react';
import type { Message } from '@/entities/message';

export const FRESH_MS = 1000;
const SEEN_LIMIT = 5000;

export const useQuietRemounts = (
  messages: Message[],
  messageRefs: MutableRefObject<{ [key: string]: HTMLDivElement | null }>,
  renderKey: string,
  chatKey: unknown,
) => {
  const firstSeenRef = useRef(new Map<string, number>());
  const chatRef = useRef(chatKey);
  useLayoutEffect(() => {
    const firstSeen = firstSeenRef.current;
    if (firstSeen.size > SEEN_LIMIT || chatRef.current !== chatKey) firstSeen.clear();
    chatRef.current = chatKey;
    const now = performance.now();
    for (const message of messages) {
      const key = String(message.id);
      const seenAt = firstSeen.get(key);
      if (seenAt === undefined) {
        firstSeen.set(key, now);
        continue;
      }
      const row = messageRefs.current[key];
      if (row && now - seenAt > FRESH_MS) row.dataset.quiet = 'true';
    }
  }, [messages, messageRefs, renderKey, chatKey]);
};
