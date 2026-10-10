import { apiUrl, webSocketRoot } from '@/shared/api/apiUrl';
import type { ResponseOf } from '@/shared/api/contract';
import { authFetch } from '@/shared/auth/session';
import { errorFromResponse } from '@/shared/lib/apiError';

// The access token must not travel in the URL (it would end up in proxy logs), so the socket is opened with
// a single-use ticket that is only valid for a few seconds (POST /ws/ticket).
export const getWebSocketUrl = async () => {
  const response = await authFetch(apiUrl('/ws/ticket'), { method: 'POST' });
  if (!response.ok) throw await errorFromResponse(response);
  const { ticket } = await response.json() as ResponseOf<'createWebSocketTicket'>;
  if (!ticket) throw new Error('Missing WebSocket ticket');
  return `${webSocketRoot()}/ws?ticket=${encodeURIComponent(ticket)}`;
};
