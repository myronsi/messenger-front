import type { EntityId } from '@/shared/api/entityId';
import type { MessageHistoryResponse } from '@/entities/message';
import { reconnectDelay } from '@/shared/api/reconnect';

const ATTEMPTS = 3;

// Fetches the page after `afterId`, retrying a failed request with backoff.
// Returns null when every attempt failed or `isCurrent()` turned false (the user left the chat).
export const fetchMissedMessages = async (
  chatId: EntityId,
  afterId: EntityId,
  limit: number,
  isCurrent: () => boolean,
  readPage: (args: { chatId: EntityId; afterId: EntityId; limit: number }) => Promise<MessageHistoryResponse>,
): Promise<MessageHistoryResponse | null> => {
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    if (!isCurrent()) return null;
    try {
      const page = await readPage({ chatId, afterId, limit });
      return isCurrent() ? page : null;
    } catch (error) {
      console.error('Error catching up on missed messages:', error);
    }
    if (attempt < ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, reconnectDelay(attempt)));
  }
  return null;
};
