// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

function worker() {
  const events: Record<string, (event: unknown) => void> = {};
  const storage = new Map<string, Response>();
  const close = vi.fn();
  let shown: { tag: string; data: unknown; close: () => void }[] = [];
  const registration = {
    showNotification: vi.fn(async (_title: string, options: NotificationOptions & { tag: string; actions?: { title: string }[] }) => {
      shown = [...shown.filter((n) => n.tag !== options.tag), { tag: options.tag, data: options.data, close }];
    }),
    getNotifications: async (filter?: { tag?: string }) => (shown.length || filter ? shown : [{ tag: '', data: null, close }])
      .filter((n) => !filter?.tag || n.tag === filter.tag),
  };
  const navigate = vi.fn(); const focus = vi.fn(); const openWindow = vi.fn(); const postMessage = vi.fn();
  const fetch = vi.fn(async () => new Response(null, { status: 204 }));
  runInNewContext(readFileSync('public/notification-worker.js', 'utf8'), {
    URL, Response, Date, fetch, encodeURIComponent,
    caches: { open: async () => ({
      put: async (key: string, value: Response) => storage.set(key, value),
      match: async (key: string) => storage.get(key)?.clone(),
    }) },
    self: {
      location: { origin: 'https://chat.test' }, registration,
      addEventListener: (type: string, callback: (event: unknown) => void) => { events[type] = callback; },
      clients: { openWindow, matchAll: async () => [{ url: 'https://chat.test/', navigate, focus, postMessage }] },
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
  const account = (user: string, origin = 'https://chat.test', extra = {}) => dispatch('message', { origin, data: { type: 'notification-account', user, ...extra } });
  return { registration, close, navigate, focus, openWindow, postMessage, fetch, dispatch, push, account };
}
describe('background notification worker', () => {
  it('retains unread system notifications when the same account reconnects', async () => {
    const w = worker(); await w.account('1'); w.close.mockClear();
    await w.account('1'); expect(w.close).not.toHaveBeenCalled();
    await w.account('2'); expect(w.close).toHaveBeenCalledTimes(1);
  });
  it('ignores account messages from another origin', async () => {
    const w = worker(); await w.account('1'); w.close.mockClear();
    await w.account('2', 'https://evil.test'); expect(w.close).not.toHaveBeenCalled();
    await w.push(); expect(w.registration.showNotification).toHaveBeenCalledTimes(1);
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
  it('stacks messages of one chat and shows the sender photo', async () => {
    const w = worker(); await w.account('1', 'https://chat.test', { api: 'https://chat.test/api/v2/', language: 'ru' });
    for (const body of ['one', 'two', 'three', 'four', 'five', 'six']) await w.push({ title: 'Mai', body, avatar_token: 'a.1.2.9.sig', read_token: 'r.1' });
    const [title, options] = w.registration.showNotification.mock.lastCall!;
    expect(title).toBe('Mai (6)');
    expect(options.body).toBe('two\nthree\nfour\nfive\nsix');
    expect(options.icon).toBe('https://chat.test/api/v2/notifications/avatar/a.1.2.9.sig');
    expect(options.actions?.map((a: { title: string }) => a.title)).toEqual(['Ответить', 'Прочитано']);
    await w.push({ chat_id: '8', title: 'Bob', body: 'hi' });
    expect(w.registration.showNotification.mock.lastCall!).toEqual(['Bob', expect.objectContaining({ body: 'hi', icon: '/pwa-192x192.png' })]);
  });
  it('marks the chat read without opening the app, and focuses the input for a reply', async () => {
    const w = worker(); await w.account('1', 'https://chat.test', { api: 'https://chat.test/api/v2' });
    const notification = { data: { user_id: '1', chat_id: '7', read_token: 'r.1.7.9.5.sig' }, close: vi.fn() };
    await w.dispatch('notificationclick', { notification, action: 'read' });
    expect(w.fetch).toHaveBeenCalledWith('https://chat.test/api/v2/notifications/read/r.1.7.9.5.sig', expect.objectContaining({ method: 'POST' }));
    expect(w.navigate).not.toHaveBeenCalled();
    await w.dispatch('notificationclick', { notification, action: 'reply' });
    expect(w.navigate).toHaveBeenCalledWith('https://chat.test/chat/7?notification=1');
    expect(w.postMessage).toHaveBeenCalledWith({ type: 'notification-reply', chat_id: '7' });
  });
});
