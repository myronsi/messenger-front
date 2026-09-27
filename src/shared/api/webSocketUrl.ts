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

export const getChatWebSocketUrl = (chatId: number, token: string) => {
  const url = new URL(`${getWebSocketBaseUrl()}/`);
  url.pathname = `${url.pathname.replace(/\/$/, '')}/ws/chat/${chatId}`;
  url.searchParams.set('token', token);
  return url.toString();
};
