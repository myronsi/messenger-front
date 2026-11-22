import { adjustDeviceClock, createDeviceProof, DEVICE_PROOF_HEADER } from '@/shared/auth/deviceKey';
import { getApiBaseUrl } from './config';

const requestUrl = (input: RequestInfo | URL) => {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  return new URL(raw, window.location.href);
};

const requestMethod = (input: RequestInfo | URL, init?: RequestInit) =>
  (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();

const authPrefix = () => `${new URL(getApiBaseUrl() || '/', window.location.href).href.replace(/\/$/, '')}/auth/`;

export const needsDeviceProof = (input: RequestInfo | URL, init?: RequestInit) =>
  requestMethod(input, init) === 'POST' && requestUrl(input).href.startsWith(authPrefix());

export const isStaleDeviceProof = async (response: Response) => {
  if (response.status !== 401) return false;
  try {
    const body: unknown = await response.clone().json();
    return typeof body === 'object' && body !== null && (body as { code?: unknown }).code === 'device_proof_stale';
  } catch {
    return false;
  }
};

export const withDeviceProof = (fetchFn: typeof fetch): typeof fetch => async (input, init) => {
  if (!needsDeviceProof(input, init)) return fetchFn(input, init);
  const url = requestUrl(input).href;
  const retryInput = input instanceof Request ? input.clone() : input;
  const send = async (target: RequestInfo | URL) => {
    const headers = new Headers(target instanceof Request ? target.headers : undefined);
    new Headers(init?.headers).forEach((value, name) => headers.set(name, value));
    const proof = await createDeviceProof('POST', url);
    if (proof) headers.set(DEVICE_PROOF_HEADER, proof);
    return fetchFn(target, { ...init, headers });
  };
  const response = await send(input);
  if (!await isStaleDeviceProof(response) || !adjustDeviceClock(response.headers.get('Date'))) return response;
  return send(retryInput);
};
