import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

type Shown = { title: string; tag: string; data: Record<string, unknown>; close: () => void } & Record<string, unknown>;

function worker() {
  const events: Record<string, (event: unknown) => void> = {};
  const storage = new Map<string, Response>();
  const timers: { callback: () => void; delay: number }[] = [];
  let shown: Shown[] = [];
  const registration = {
    showNotification: vi.fn(async (title: string, options: { tag: string; data: Record<string, unknown> } & Record<string, unknown>) => {
      const entry: Shown = { ...options, title, tag: options.tag, data: options.data, close: () => { shown = shown.filter((n) => n !== entry); } };
      shown = [...shown.filter((n) => n.tag !== options.tag), entry];
    }),
    getNotifications: async (filter?: { tag?: string }) => shown.filter((n) => !filter?.tag || n.tag === filter.tag),
  };
  const navigate = vi.fn(); const focus = vi.fn(); const openWindow = vi.fn();
  runInNewContext(readFileSync('public/notification-worker.js', 'utf8'), {
    URL, Response, Date, encodeURIComponent, fetch: vi.fn(),
    setTimeout: (callback: () => void, delay: number) => { timers.push({ callback, delay }); return timers.length; },
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
  const dispatch = (type: string, data: Record<string, unknown>) => {
    let pending: Promise<unknown> = Promise.resolve();
    events[type]({ ...data, waitUntil: (promise: Promise<unknown>) => { pending = promise; } });
    return pending;
  };
  const push = (extra: Record<string, unknown>) => dispatch('push', { data: { json: () => ({
    type: 'call', action: 'ring', call_id: '500', chat_id: '77', user_id: '1', kind: 'direct', title: 'Alice', preview: true,
    sender_id: '2', expires_at: Date.now() + 30_000, ...extra,
  }) } });
  const account = (user: string, extra = {}) => dispatch('message', { origin: 'https://chat.test', data: { type: 'notification-account', user, ...extra } });
  const settle = async () => { for (let i = 0; i < 5; i += 1) await new Promise((resolve) => { globalThis.setTimeout(resolve, 0); }); };
  return { registration, timers, shown: () => shown, navigate, focus, dispatch, push, account, settle };
}

describe('call notifications in the service worker', () => {
  it('shows one ringing notification per call and closes it when the ring expires', async () => {
    const w = worker(); await w.account('1');
    const ringing = w.push({});
    await w.settle();
    expect(w.registration.showNotification).toHaveBeenCalledWith('Alice', expect.objectContaining({
      tag: 'call-500', body: 'Incoming call', requireInteraction: true, renotify: true,
      data: expect.objectContaining({ type: 'call', call_id: '500', chat_id: '77' }),
    }));
    expect(w.timers[0].delay).toBeGreaterThan(29_000);
    expect(w.timers[0].delay).toBeLessThanOrEqual(30_000);
    w.timers[0].callback();
    await ringing;
    expect(w.shown()).toHaveLength(0);
  });

  it('accepts the expiry in seconds like message pushes', async () => {
    const w = worker(); await w.account('1');
    void w.push({ expires_at: Math.floor(Date.now() / 1000) + 20 });
    await w.settle();
    expect(w.shown()).toHaveLength(1);
    expect(w.timers[0].delay).toBeGreaterThan(15_000);
  });

  it('closes the notification on cancel and ignores a late ring for that call', async () => {
    const w = worker(); await w.account('1');
    void w.push({});
    await w.settle();
    await w.push({ action: 'cancel' });
    expect(w.shown()).toHaveLength(0);
    void w.push({});
    await w.settle();
    expect(w.shown()).toHaveLength(0);
  });

  it('localizes the text, hides the caller without previews and drops expired or foreign pushes', async () => {
    const w = worker(); await w.account('1', { language: 'ru' });
    void w.push({ kind: 'group', title: 'Messenger', preview: false });
    await w.settle();
    expect(w.registration.showNotification).toHaveBeenLastCalledWith('Messenger', expect.objectContaining({ body: 'Входящий групповой звонок' }));
    await w.push({ call_id: '501', expires_at: Date.now() - 1 });
    await w.push({ call_id: '502', user_id: '2' });
    expect(w.registration.showNotification).toHaveBeenCalledTimes(1);
  });

  it('opens the chat of the call on click', async () => {
    const w = worker(); await w.account('1');
    const notification = { data: { type: 'call', call_id: '500', chat_id: '77', user_id: '1' }, close: vi.fn() };
    await w.dispatch('notificationclick', { notification });
    expect(notification.close).toHaveBeenCalled();
    expect(w.navigate).toHaveBeenCalledWith('https://chat.test/chat/77?notification=1');
    expect(w.focus).toHaveBeenCalled();
  });

  it('closes ring notifications whose expiry passed on the next push or click', async () => {
    const w = worker(); await w.account('1');
    void w.push({});
    void w.push({ call_id: '501' });
    await w.settle();
    w.shown()[0].data.expires_at = Date.now() - 1;
    await w.dispatch('push', { data: { json: () => null } });
    expect(w.shown().map((n) => n.tag)).toEqual(['call-501']);
    w.shown()[0].data.expires_at = Date.now() - 1;
    await w.dispatch('notificationclick', { notification: { data: { chat_id: '7', user_id: '1' }, close: vi.fn() } });
    expect(w.shown()).toHaveLength(0);
  });

  it('keeps message notifications working next to calls', async () => {
    const w = worker(); await w.account('1');
    await w.dispatch('push', { data: { json: () => ({ user_id: '1', chat_id: '7', message_id: '9', title: 'Mai', body: 'hi', expires_at: Date.now() / 1000 + 300 }) } });
    expect(w.registration.showNotification).toHaveBeenCalledWith('Messenger', expect.objectContaining({ tag: 'chat-7' }));
  });
});
