// The one place that knows where the v2 API lives. Every request builds its URL with apiUrl(), so no
// component reads the environment or writes a host by hand.
//
// VITE_API_URL is the API root, used as it is (https://chat.example.com/api/v2, or the mock server's root).
// VITE_BASE_URL, the variable of the v1 deployments, still works: the host root, a reverse proxy's /api
// prefix or the /api/v2 root. VITE_WS_URL overrides where the WebSocket connects, in the same forms with
// ws:// or wss://.

const API_PATH = '/api/v2';

const fallbackOrigin = () => globalThis.location?.origin ?? 'http://localhost';

const trimTrailingSlashes = (value: string) => {
  let end = value.length;
  while (end > 0 && value[end - 1] === '/') end -= 1;
  return value.slice(0, end);
};

// toApiRoot turns any of the accepted forms into the API root, without a trailing slash.
export const toApiRoot = (configured: string | undefined, origin: string = fallbackOrigin()) => {
  const url = new URL(configured?.trim() || origin, origin);
  url.search = '';
  url.hash = '';
  const path = trimTrailingSlashes(url.pathname);
  if (path.endsWith(API_PATH)) url.pathname = path;
  else if (path.endsWith('/api')) url.pathname = `${path}/v2`;
  else url.pathname = `${path}${API_PATH}`;
  return trimTrailingSlashes(url.toString());
};

const env = import.meta.env;

// resolveApiRoot picks the root from the environment: VITE_API_URL exactly, else VITE_BASE_URL normalized.
export const resolveApiRoot = (apiUrlSetting: string | undefined, baseUrlSetting: string | undefined, origin: string = fallbackOrigin()) => {
  const explicit = apiUrlSetting?.trim();
  if (explicit) return trimTrailingSlashes(new URL(explicit, origin).toString());
  return toApiRoot(baseUrlSetting, origin);
};

export const API_ROOT = resolveApiRoot(env.VITE_API_URL, env.VITE_BASE_URL);

// apiUrl('/chats') -> https://chat.example.com/api/v2/chats
export const apiUrl = (path: string) => `${API_ROOT}${path.startsWith('/') ? path : `/${path}`}`;

// webSocketRoot is the API root with a ws:// or wss:// scheme.
export const toWebSocketRoot = (apiRoot: string, configured?: string) => {
  const root = configured?.trim() ? toApiRoot(configured, apiRoot) : apiRoot;
  const url = new URL(root);
  if (url.protocol === 'https:') url.protocol = 'wss:';
  else if (url.protocol === 'http:') url.protocol = 'ws:';
  return trimTrailingSlashes(url.toString());
};

export const webSocketRoot = () => toWebSocketRoot(API_ROOT, env.VITE_WS_URL as string | undefined);

// isApiUrl tells whether a request goes to the backend (and gets the client version headers).
export const isApiUrl = (url: string) =>
  url === API_ROOT || (url.startsWith(API_ROOT) && ['/', '?', '#'].includes(url.charAt(API_ROOT.length)));
