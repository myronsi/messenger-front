import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const API = 'https://chat.example.test/api';

const load = async () => {
  vi.resetModules();
  vi.stubEnv('VITE_BASE_URL', API);
  vi.stubEnv('VITE_CLIENT_API_VERSION', '2.2.0');
  const [fetchModule, gate] = await Promise.all([import('./clientVersionFetch'), import('./updateGate')]);
  return { ...fetchModule, gate };
};

const problem = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/problem+json' },
});

describe('client version headers', () => {
  const baseFetch = vi.fn<typeof fetch>();

  beforeEach(() => { baseFetch.mockReset(); baseFetch.mockResolvedValue(new Response('{}')); });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('adds both version headers to backend requests', async () => {
    const { withClientVersion } = await load();
    await withClientVersion(baseFetch)(`${API}/auth/ws-ticket`, { method: 'POST', headers: { Authorization: 'Bearer t' } });

    const headers = new Headers(baseFetch.mock.calls[0][1]?.headers);
    expect(headers.get('X-Client-Api-Version')).toBe('2.2.0');
    expect(headers.get('X-Client-Version')).toBeTruthy();
    expect(headers.get('Authorization')).toBe('Bearer t');
  });

  it('keeps headers of a Request object', async () => {
    const { withClientVersion } = await load();
    await withClientVersion(baseFetch)(new Request(`${API}/chats`, { headers: { 'X-Other': '1' } }));

    expect(new Headers(baseFetch.mock.calls[0][1]?.headers).get('X-Other')).toBe('1');
  });

  it.each(['https://cdn.example.test/avatar.png', 'https://chat.example.test/apix/other', 'https://chat.example.test/api-v2'])(
    'leaves %s untouched',
    async (url) => {
      const { withClientVersion } = await load();
      await withClientVersion(baseFetch)(url);
      expect(baseFetch).toHaveBeenCalledWith(url, undefined);
    },
  );

  it('requires an update on 426 client_outdated', async () => {
    const { withClientVersion, gate } = await load();
    baseFetch.mockResolvedValue(problem(426, { code: 'client_outdated', status: 426 }));

    const response = await withClientVersion(baseFetch)(`${API}/chats`);

    expect(response.status).toBe(426);
    expect(gate.getUpdateStatus()).toBe('required');
  });

  it.each([
    [426, { code: 'something_else' }],
    [400, { code: 'client_outdated' }],
    [426, 'not an object'],
  ])('ignores %s %j', async (status, body) => {
    const { withClientVersion, gate } = await load();
    baseFetch.mockResolvedValue(problem(status, body));

    await withClientVersion(baseFetch)(`${API}/chats`);

    expect(gate.getUpdateStatus()).toBe('none');
  });

  it('does not fail on a 426 without a JSON body', async () => {
    const { withClientVersion, gate } = await load();
    baseFetch.mockResolvedValue(new Response('Upgrade Required', { status: 426 }));

    await expect(withClientVersion(baseFetch)(`${API}/chats`)).resolves.toBeInstanceOf(Response);
    expect(gate.getUpdateStatus()).toBe('none');
  });

  it('sets the headers on XMLHttpRequest uploads', async () => {
    const { applyClientVersionToXhr } = await load();
    const xhr = { setRequestHeader: vi.fn() } as unknown as XMLHttpRequest;
    applyClientVersionToXhr(xhr);
    expect(xhr.setRequestHeader).toHaveBeenCalledWith('X-Client-Api-Version', '2.2.0');
  });
});