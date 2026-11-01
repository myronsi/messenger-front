import { beforeEach, expect, it, vi } from 'vitest';
import { authFetch } from '@/shared/auth/session';
import { notificationReturnPath, resolveNotificationChat } from './resolveNotificationChat';
vi.mock('@/shared/auth/session', () => ({ authFetch: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
it('keeps a notification destination through login and excludes arbitrary redirects', () => {
  expect(notificationReturnPath('/chat/7', '?notification=1')).toBe('/chat/7?notification=1');
  expect(notificationReturnPath('//outside.test', '?notification=1')).toBe('/');
  expect(notificationReturnPath('/chat/7', '')).toBe('/');
});
it('resolves groups and direct conversations using authenticated data', async () => {
  vi.mocked(authFetch).mockResolvedValueOnce(new Response(JSON.stringify({ type: 'group', name: 'Project' })));
  expect(await resolveNotificationChat('7')).toMatchObject({ type: 'group', chatName: 'Project', chatId: '7' });
  vi.mocked(authFetch).mockResolvedValueOnce(new Response(JSON.stringify({ type: 'private', name: 'Alice Smith', peer: { username: 'alice' } })));
  expect(await resolveNotificationChat('8')).toMatchObject({ type: 'one-on-one', chatName: 'alice' });
});
it('refuses to open an inaccessible conversation', async () => {
  vi.mocked(authFetch).mockResolvedValueOnce(new Response('', { status: 404 }));
  await expect(resolveNotificationChat('9')).rejects.toThrow('Conversation unavailable');
});
