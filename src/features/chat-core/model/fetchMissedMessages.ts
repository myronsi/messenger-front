import type { MessageHistoryResponse } from '@/entities/message';
import { reconnectDelay } from '@/shared/api/reconnect';
import { authFetch } from '@/shared/auth/session';
import type { Id } from '@/shared/lib/ids';

const BASE_URL = import.meta.env.VITE_BASE_URL;
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
      const params = new URLSearchParams({ limit: String(limit), after_id: String(afterId) });
      const response = await authFetch(`${BASE_URL}/messages/history/${chatId}?${params.toString()}`);
      if (response.ok) return isCurrent() ? await response.json() : null;
    } catch (error) {
      console.error('Error catching up on missed messages:', error);
    }
    if (attempt < ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, reconnectDelay(attempt)));
  }
  return null;
};
