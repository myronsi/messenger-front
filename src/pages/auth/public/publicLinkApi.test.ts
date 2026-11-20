import { beforeEach, expect, it, vi } from 'vitest';
import { publicApiClient } from '@/shared/api/client';
import { loadPublicInvite, loadPublicName } from './publicLinkApi';

vi.mock('@/shared/api/client', () => ({ publicApiClient: { GET: vi.fn() } }));
const get = vi.mocked(publicApiClient.GET) as unknown as ReturnType<typeof vi.fn>;
const answer = (status: number, data?: unknown) => ({ data, response: new Response(null, { status }) });

beforeEach(() => get.mockReset());

it('reads users, groups and unavailable names without a session', async () => {
  get.mockResolvedValueOnce(answer(200, { kind: 'user', user: { username: 'anna' } }));
  expect(await loadPublicName('anna')).toEqual({ kind: 'user', user: { username: 'anna' } });
  get.mockResolvedValueOnce(answer(200, { kind: 'group', group: { name: 'G' } }));
  expect(await loadPublicName('g_name')).toEqual({ kind: 'group', group: { name: 'G' } });
  get.mockResolvedValueOnce(answer(200, { kind: 'unavailable' }));
  expect(await loadPublicName('ghost')).toEqual({ kind: 'unavailable' });
  get.mockResolvedValueOnce(answer(200, { kind: 'something_new' }));
  expect(await loadPublicName('ghost')).toEqual({ kind: 'unavailable' });
  expect(get).toHaveBeenCalledWith('/public/names/{public_name}', expect.objectContaining({ params: { path: { public_name: 'anna' } } }));
});

it('tells rate limits and failures apart', async () => {
  get.mockResolvedValueOnce(answer(429));
  expect(await loadPublicName('anna')).toEqual({ kind: 'limited' });
  get.mockResolvedValueOnce(answer(500));
  expect(await loadPublicInvite('t')).toEqual({ kind: 'failed' });
});

it('treats an invite 404 as a link that does not work', async () => {
  get.mockResolvedValueOnce(answer(404));
  expect(await loadPublicInvite('t')).toEqual({ kind: 'unavailable' });
  get.mockResolvedValueOnce(answer(200, { name: 'G', member_count: 2 }));
  expect(await loadPublicInvite('t')).toEqual({ kind: 'group', group: { name: 'G', member_count: 2 } });
});
