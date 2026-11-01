// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

function worker() {
  const events: Record<string, (event: unknown) => void> = {};
  const storage = new Map<string, Response>();
  const close = vi.fn();
  const registration = { showNotification: vi.fn(), getNotifications: async () => [{ close }] };
  const navigate = vi.fn(); const focus = vi.fn(); const openWindow = vi.fn();
  runInNewContext(readFileSync('public/notification-worker.js', 'utf8'), {
    URL, Response, Date,
    caches: { open: async () => ({
      put: async (key: string, value: Response) => storage.set(key, value),
      match: async (key: string) => storage.get(key)?.clone(),
    }) },
    self: {
      location: { origin: 'https://chat.test' }, registration,
      addEventListener: (type: string, callback: (event: unknown) => void) => { events[type] = callback; },
      clients: { openWindow, matchAll: async () => [{ url: 'https://chat.test/', navigate, focus }] },
    },
  });
  const dispatch = async (type: string, data: Record<string, unknown>) => {
    let pending: Promise<unknown> | undefined;
    events[type]({ ...data, waitUntil: (promise: Promise<unknown>) => { pending = promise; } });
    await pending;
  };
  const push = (extra = {}) => dispatch('push', { data: { json: () => ({
    user_id: '1', chat_id: '7', message_id: '9', title: 'Messenger', body: 'New message', expires_at: Date.now() / 1000 + 300, ...extra,
  }) } });
  const account = (user: string) => dispatch('message', { data: { type: 'notification-account', user } });
  return { registration, close, navigate, focus, openWindow, dispatch, push, account };
}
describe('background notification worker', () => {
  it('retains unread system notifications when the same account reconnects', async () => {
    const w = worker(); await w.account('1'); w.close.mockClear();
    await w.account('1'); expect(w.close).not.toHaveBeenCalled();
    await w.account('2'); expect(w.close).toHaveBeenCalledTimes(1);
  });
  it('only displays unexpired pushes for the signed-in account', async () => {
    const w = worker(); await w.account('1');
    await w.push({ user_id: '2' }); await w.push({ expires_at: 1 });
    expect(w.registration.showNotification).not.toHaveBeenCalled();
    await w.push();
    expect(w.registration.showNotification).toHaveBeenCalledWith('Messenger', expect.objectContaining({ tag: 'chat-7', silent: true }));
    await w.account(''); await w.push(); expect(w.registration.showNotification).toHaveBeenCalledTimes(1);
    expect(w.close).toHaveBeenCalled();
  });
  it('focuses an existing app window and refuses clicks for a different account', async () => {
    const w = worker(); await w.account('1');
    const notification = { data: { user_id: '1', chat_id: '7' }, close: vi.fn() };
    await w.dispatch('notificationclick', { notification });
    expect(w.navigate).toHaveBeenCalledWith('https://chat.test/chat/7?notification=1'); expect(w.focus).toHaveBeenCalled();
    await w.account('2'); await w.dispatch('notificationclick', { notification }); expect(w.navigate).toHaveBeenCalledTimes(1);
  });
});
