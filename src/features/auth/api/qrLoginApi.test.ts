import { afterEach, expect, it, vi } from 'vitest';
import { qrLoginRequestId } from '@/shared/lib/qrLoginPath';
import { createQrLogin, pollQrLogin } from './qrLoginApi';

vi.mock('@/shared/api/config', () => ({ getApiBaseUrl: () => 'https://api.test/api/v2' }));

const id = 'kQ3m9xV_2bL-7hT0pZcR4sN8wY1eA6uJ5fG2dK9oPqE';
const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => { vi.unstubAllGlobals(); });

it('resolves a relative code link against this origin', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json({
    request_id: id, poll_token: 'secret', url: `/qr/${id}`, expires_at: '2030-01-01T00:00:00Z',
  }, 201)));
  const start = await createQrLogin();
  expect(start.url).toBe(`${window.location.origin}/qr/${id}`);
  expect(qrLoginRequestId(new URL(start.url).pathname)).toBe(id);
});

it('keeps an absolute code link and sends the poll token', async () => {
  const fetcher = vi.fn()
    .mockResolvedValueOnce(json({ request_id: id, poll_token: 'secret', url: `https://web.test/qr/${id}`, expires_at: '2030-01-01T00:00:00Z' }, 201))
    .mockResolvedValueOnce(json({ status: 'scanned' }, 200));
  vi.stubGlobal('fetch', fetcher);
  expect((await createQrLogin()).url).toBe(`https://web.test/qr/${id}`);
  expect(await pollQrLogin(id, 'secret')).toEqual({ status: 'scanned' });
  const request = fetcher.mock.calls[1][0] as Request;
  expect(request.url).toBe(`https://api.test/api/v2/auth/qr-login/${id}/poll`);
  expect(await request.json()).toEqual({ poll_token: 'secret' });
});

it('reports a rate limit as a problem with its status', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json({ code: 'too_many_requests', status: 429 }, 429)));
  await expect(createQrLogin()).rejects.toMatchObject({ status: 429 });
});
