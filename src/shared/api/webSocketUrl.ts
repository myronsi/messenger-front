import { authFetch } from '@/shared/auth/session';

const BASE_URL = import.meta.env.VITE_BASE_URL;
const WS_URL = import.meta.env.VITE_WS_URL;

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '');

const getWebSocketBaseUrl = () => {
  const configuredWebSocketUrl = WS_URL?.trim();
  if (configuredWebSocketUrl) {
    return trimTrailingSlashes(configuredWebSocketUrl);
  }

  const apiUrl = new URL(BASE_URL || window.location.origin, window.location.origin);
  apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  apiUrl.pathname = '';
  apiUrl.search = '';
  apiUrl.hash = '';

  return trimTrailingSlashes(apiUrl.toString());
};

// The access token must not travel in the URL (it would end up in proxy logs), so the socket is
// opened with a single-use ticket that is only valid for a few seconds.
const requestWebSocketTicket = async () => {
  const response = await authFetch(`${BASE_URL}/auth/ws-ticket`, { method: 'POST' });
  if (!response.ok) throw new Error(`WebSocket ticket request failed (${response.status})`);
  const { ticket } = await response.json();
  if (typeof ticket !== 'string' || !ticket) throw new Error('Missing WebSocket ticket');
  return ticket;
};

export const getChatWebSocketUrl = async (chatId: number) => {
  const url = new URL(`${getWebSocketBaseUrl()}/`);
  url.pathname = `${url.pathname.replace(/\/$/, '')}/ws/chat/${chatId}`;
  url.searchParams.set('ticket', await requestWebSocketTicket());
  return url.toString();
};
