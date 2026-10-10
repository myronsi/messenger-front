import type { MessageHistoryResponse } from '@/entities/message';
import { reconnectDelay } from '@/shared/api/reconnect';
import { historyPath, toHistoryResponse } from '@/entities/message';
import { apiUrl } from '@/shared/api/apiUrl';
import { authFetch } from '@/shared/auth/session';
import type { Id } from '@/shared/lib/ids';
const ATTEMPTS = 3;

// Fetches the page after `afterId`, retrying a failed request with backoff.
// Returns null when every attempt failed or `isCurrent()` turned false (the user left the chat).
export const fetchMissedMessages = async (
  chatId: Id,
  afterId: Id,
  limit: number,
  isCurrent: () => boolean,
): Promise<MessageHistoryResponse | null> => {
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    if (!isCurrent()) return null;
    try {
      const response = await authFetch(apiUrl(historyPath(chatId, { limit, after: afterId })));
      if (response.ok) return isCurrent() ? toHistoryResponse(await response.json(), 'after') : null;
    } catch (error) {
      console.error('Error catching up on missed messages:', error);
    }
    if (attempt < ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, reconnectDelay(attempt)));
  }
  return null;
};
