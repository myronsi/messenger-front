import { clientVersionHeaders } from './clientVersion';
import { reportClientOutdated } from './updateGate';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const getApiPrefix = () => new URL(BASE_URL || '/', window.location.href).href.replace(/\/$/, '');

const requestUrl = (input: RequestInfo | URL) => {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  return new URL(raw, window.location.href).href;
};

// Only requests to the backend get the version headers; media CDNs and third-party URLs are left alone.
export const isBackendRequest = (input: RequestInfo | URL) => {
  const prefix = getApiPrefix();
  const url = requestUrl(input);
  return url === prefix || (url.startsWith(prefix) && ['/', '?', '#'].includes(url.charAt(prefix.length)));
};

export const applyClientVersionHeaders = (headers: Headers) => {
  Object.entries(clientVersionHeaders()).forEach(([name, value]) => headers.set(name, value));
  return headers;
};

export const applyClientVersionToXhr = (xhr: XMLHttpRequest) => {
  Object.entries(clientVersionHeaders()).forEach(([name, value]) => xhr.setRequestHeader(name, value));
};

// `426 Upgrade Required` with `code: "client_outdated"` means the backend no longer supports this client's contract.
export const reportIfClientOutdated = (status: number, body: unknown) => {
  if (status !== 426 || typeof body !== 'object' || body === null) return false;
  if ((body as { code?: unknown }).code !== 'client_outdated') return false;
  reportClientOutdated();
  return true;
};

const inspectResponse = async (response: Response) => {
  if (response.status !== 426) return;
  try {
    reportIfClientOutdated(response.status, await response.clone().json());
  } catch {
    // not a problem+json body
  }
};

export const withClientVersion = (fetchFn: typeof fetch): typeof fetch => async (input, init) => {
  if (!isBackendRequest(input)) return fetchFn(input, init);

  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init?.headers).forEach((value, name) => headers.set(name, value));
  applyClientVersionHeaders(headers);

  const response = await fetchFn(input, { ...init, headers });
  await inspectResponse(response);
  return response;
};

// Every backend request (RTK Query, auth, uploads, the WebSocket ticket) goes through window.fetch, so wrapping it once
// guarantees the headers are never forgotten by a new call site.
export const installClientVersionFetch = () => {
  const current = window.fetch as typeof fetch & { clientVersionInstalled?: boolean };
  if (current.clientVersionInstalled) return;
  const wrapped = withClientVersion(current.bind(window)) as typeof fetch & { clientVersionInstalled?: boolean };
  wrapped.clientVersionInstalled = true;
  window.fetch = wrapped;
};
