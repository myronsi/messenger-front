import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { adjustDeviceClock, createDeviceProof } from '@/shared/auth/deviceKey';
import { getApiBaseUrl } from './config';
import { withDeviceProof } from './deviceProofFetch';

vi.mock('@/shared/auth/deviceKey', () => ({
  DEVICE_PROOF_HEADER: 'Device-Proof',
  createDeviceProof: vi.fn(),
  adjustDeviceClock: vi.fn(),
}));

const api = (path: string) => new URL(`${getApiBaseUrl()}${path}`, window.location.href).href;

const stale = (date: string | null) => new Response(JSON.stringify({ status: 401, code: 'device_proof_stale' }), {
  status: 401,
  headers: { 'Content-Type': 'application/problem+json', ...(date ? { Date: date } : {}) },
});

const proofOf = (fetcher: Mock<typeof fetch>, call: number) => new Headers(fetcher.mock.calls[call][1]?.headers).get('Device-Proof');

describe('withDeviceProof', () => {
  afterEach(() => {
    vi.mocked(createDeviceProof).mockReset();
    vi.mocked(adjustDeviceClock).mockReset();
  });

  it('adds a proof for the exact URL to every auth POST', async () => {
    vi.mocked(createDeviceProof).mockResolvedValue('proof');
    const fetcher = vi.fn<typeof fetch>(async () => new Response('{}'));
    await withDeviceProof(fetcher)(api('/auth/refresh'), { method: 'POST', headers: { 'X-Test': '1' } });
    await withDeviceProof(fetcher)(new Request(api('/auth/login'), { method: 'POST', body: '{}' }));
    expect(proofOf(fetcher, 0)).toBe('proof');
    expect(new Headers(fetcher.mock.calls[0][1]?.headers).get('X-Test')).toBe('1');
    expect(proofOf(fetcher, 1)).toBe('proof');
    expect(createDeviceProof).toHaveBeenNthCalledWith(1, 'POST', api('/auth/refresh'));
    expect(createDeviceProof).toHaveBeenNthCalledWith(2, 'POST', api('/auth/login'));
  });

  it('leaves other requests alone', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response('{}'));
    await withDeviceProof(fetcher)(api('/auth/qr-login/1'));
    await withDeviceProof(fetcher)(api('/chats'), { method: 'POST' });
    await withDeviceProof(fetcher)('https://elsewhere.test/api/v2/auth/login', { method: 'POST' });
    expect(createDeviceProof).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('sends the request without a proof when the browser has no device key', async () => {
    vi.mocked(createDeviceProof).mockResolvedValue(null);
    const fetcher = vi.fn<typeof fetch>(async () => new Response('{}'));
    await withDeviceProof(fetcher)(api('/auth/login'), { method: 'POST' });
    expect(proofOf(fetcher, 0)).toBeNull();
  });

  it('retries once with the server clock when the proof is stale', async () => {
    vi.mocked(createDeviceProof).mockResolvedValueOnce('first').mockResolvedValueOnce('second');
    vi.mocked(adjustDeviceClock).mockReturnValue(true);
    const date = new Date(Date.now() + 900_000).toUTCString();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(stale(date)).mockResolvedValueOnce(stale(date));
    const response = await withDeviceProof(fetcher)(new Request(api('/auth/login'), { method: 'POST', body: '{"username":"a"}' }));
    expect(response.status).toBe(401);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(adjustDeviceClock).toHaveBeenCalledWith(date);
    expect(proofOf(fetcher, 0)).toBe('first');
    expect(proofOf(fetcher, 1)).toBe('second');
    expect(await (fetcher.mock.calls[1][0] as Request).text()).toBe('{"username":"a"}');
  });

  it('does not retry a stale proof without a server date, or another 401', async () => {
    vi.mocked(createDeviceProof).mockResolvedValue('proof');
    vi.mocked(adjustDeviceClock).mockReturnValue(false);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(stale(null))
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 'invalid_token' }), { status: 401 }));
    expect((await withDeviceProof(fetcher)(api('/auth/refresh'), { method: 'POST' })).status).toBe(401);
    vi.mocked(adjustDeviceClock).mockReturnValue(true);
    expect((await withDeviceProof(fetcher)(api('/auth/refresh'), { method: 'POST' })).status).toBe(401);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
