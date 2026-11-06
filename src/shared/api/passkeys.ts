import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { apiClient, publicApiClient } from './client';
import { setAccessToken } from '@/shared/auth/session';
import type { components } from './generated/schema';
import { ApiProblem } from './problem';

export const registerPasskey = async (body: components['schemas']['PasskeyRegistration']) => {
  const options = await apiClient.POST('/auth/passkeys/register/options', { body });
  if (options.error || !options.data) throw new ApiProblem(options.response.status, options.error, 'Unable to add a passkey. Check your password and authentication code.');
  const credential = await startRegistration({
    optionsJSON: options.data.public_key as unknown as Parameters<typeof startRegistration>[0]['optionsJSON'],
  });
  const result = await apiClient.POST('/auth/passkeys/register/verify', {
    body: { challenge_id: options.data.challenge_id, credential: { ...credential } },
  });
  if (result.error) throw new Error('The passkey could not be registered. Please try again.');
};

export class PasskeyVerifyError extends Error {
  constructor() {
    super('Passkey sign-in failed. Please try again.');
    this.name = 'PasskeyVerifyError';
  }
}

export const signInWithPasskey = async (username = '', autofill = false, signal?: AbortSignal) => {
  const options = await publicApiClient.POST('/auth/passkeys/login/options', {
    body: username.trim() ? { username: username.trim().toLowerCase() } : {}, signal,
  });
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  if (options.error || !options.data) throw new Error('Passkey sign-in is unavailable. Use your password or try again.');
  const credential = await startAuthentication({
    optionsJSON: options.data.public_key as unknown as Parameters<typeof startAuthentication>[0]['optionsJSON'],
    useBrowserAutofill: autofill,
  });
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  const result = await publicApiClient.POST('/auth/passkeys/login/verify', {
    body: { challenge_id: options.data.challenge_id, credential: { ...credential } }, signal,
  }).catch((failure: unknown) => {
    if (signal?.aborted) throw failure;
    throw new PasskeyVerifyError();
  });
  if (result.error || !result.data?.access_token) throw new PasskeyVerifyError();
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  setAccessToken(result.data.access_token);
  const me = await apiClient.GET('/me');
  if (!me.data) throw new Error('Signed in. Please reload to open your account.');
  return me.data.username;
};
