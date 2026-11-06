import { apiClient, publicApiClient } from '@/shared/api/client';
import { ApiProblem, problemStatus } from '@/shared/api/problem';
import { setAccessToken } from '@/shared/auth/session';
import type { QrLoginApproved } from '../model/qrLoginTypes';

const unwrap = <T>(result: { data?: T; error?: unknown; response: Response }): T => {
  if (!result.response.ok) throw new ApiProblem(result.response.status, result.error);
  return result.data as T;
};

const path = (requestId: string) => ({ path: { requestId } });

export const isQrLoginGone = (error: unknown) => problemStatus(error) === 404;
export const isQrLoginUsed = (error: unknown) => problemStatus(error) === 409;
export const isQrLoginForbidden = (error: unknown) => problemStatus(error) === 403;
export const isRateLimited = (error: unknown) => problemStatus(error) === 429;

export const resolveQrLoginUrl = (url: string) => new URL(url, window.location.origin).href;

export const createQrLogin = async (signal?: AbortSignal) => {
  const start = unwrap(await publicApiClient.POST('/auth/qr-login', { signal }));
  return { ...start, url: resolveQrLoginUrl(start.url) };
};

export const pollQrLogin = async (requestId: string, pollToken: string, signal?: AbortSignal) => unwrap(
  await publicApiClient.POST('/auth/qr-login/{requestId}/poll', { params: path(requestId), body: { poll_token: pollToken }, signal }),
);

export const getQrLogin = async (requestId: string, signal?: AbortSignal) => unwrap(
  await apiClient.GET('/auth/qr-login/{requestId}', { params: path(requestId), signal }),
);

export const approveQrLogin = async (requestId: string, code?: string) => {
  unwrap(await apiClient.POST('/auth/qr-login/{requestId}/approve', { params: path(requestId), body: code ? { code } : {} }));
};

export const denyQrLogin = async (requestId: string) => {
  unwrap(await apiClient.POST('/auth/qr-login/{requestId}/deny', { params: path(requestId) }));
};

export const finishQrSignIn = async (result: QrLoginApproved) => {
  setAccessToken(result.access_token);
  const me = await apiClient.GET('/me');
  if (!me.data) throw new Error('Signed in. Please reload to open your account.');
  return me.data.username;
};
