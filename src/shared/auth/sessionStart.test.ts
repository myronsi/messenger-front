import { afterEach, expect, it, vi } from 'vitest';
import { authFetch, setAccessToken } from './session';

vi.mock('./deviceKey', async (importOriginal) => ({
  ...await importOriginal<typeof import('./deviceKey')>(),
  forgetDeviceKey: vi.fn(async () => undefined),
  forgetCachedDeviceKey: vi.fn(),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

it('does not send a request without a token while the expected session is still being restored', async () => {
  setAccessToken(null);
  localStorage.setItem('had_session', '1');
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    if (String(input).endsWith('/auth/refresh')) throw new TypeError('Failed to fetch');
    return new Response('{}', { status: 401 });
  });
  vi.stubGlobal('fetch', fetcher);
  await expect(authFetch('https://api.test/chats')).rejects.toThrow();
  expect(fetcher.mock.calls.map(([input]) => String(input)).some((url) => url.endsWith('/chats'))).toBe(false);
});
