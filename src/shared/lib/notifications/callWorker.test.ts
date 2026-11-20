import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

type Shown = { title: string; tag: string; data: Record<string, unknown>; close: () => void } & Record<string, unknown>;

const seconds = (offsetMs: number) => Math.floor((Date.now() + offsetMs) / 1000);

function worker(globals: Record<string, unknown> = {}) {
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
  const navigate = vi.fn(); const focus = vi.fn(); const openWindow = vi.fn(); const postMessage = vi.fn();
  const fetch = vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 204 }));
  runInNewContext(readFileSync('public/notification-worker.js', 'utf8'), {
    URL, Response, Date, encodeURIComponent, fetch, ...globals,
    setTimeout: (callback: () => void, delay: number) => { timers.push({ callback, delay }); return timers.length; },
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
  const dispatch = (type: string, data: Record<string, unknown>) => {
    let pending: Promise<unknown> = Promise.resolve();
    events[type]({ ...data, waitUntil: (promise: Promise<unknown>) => { pending = promise; } });
    return pending;
  };
  const push = (extra: Record<string, unknown>) => dispatch('push', { data: { json: () => ({
    type: 'call', action: 'ring', call_id: '500', call_chat_id: '77', user_id: '1', kind: 'direct', title: 'Alice', preview: true,
    sender_id: '2', expires_at: seconds(30_000), ...extra,
  }) } });
  const message = (extra: Record<string, unknown> = {}) => dispatch('push', { data: { json: () => ({
    user_id: '1', chat_id: '7', message_id: '9', title: 'Messenger', expires_at: Date.now() / 1000 + 300, ...extra,
  }) } });
  const account = (user: string, extra = {}) => dispatch('message', { origin: 'https://chat.test', data: { type: 'notification-account', user, ...extra } });
  const settle = async () => { for (let i = 0; i < 5; i += 1) await new Promise((resolve) => { globalThis.setTimeout(resolve, 0); }); };
  return { registration, timers, shown: () => shown, navigate, focus, postMessage, fetch, dispatch, push, message, account, settle };
}

describe('call notifications in the service worker', () => {
  it('rings once per call and turns the ring into a missed call when it expires', async () => {
    const w = worker(); await w.account('1');
    const ringing = w.push({});
    await w.settle();
    expect(w.registration.showNotification).toHaveBeenCalledWith('Alice', expect.objectContaining({
      tag: 'call-500', body: 'Incoming call', requireInteraction: true, renotify: true,
      data: expect.objectContaining({ type: 'call', call_id: '500', chat_id: '77' }),
    }));
    expect(w.timers[0].delay).toBeGreaterThan(28_000);
    expect(w.timers[0].delay).toBeLessThanOrEqual(30_000);
    w.timers[0].callback();
    await ringing;
    expect(w.shown()).toHaveLength(1);
    expect(w.shown()[0]).toMatchObject({
      title: 'Alice', tag: 'call-500', body: 'Missed call', requireInteraction: false, renotify: false,
      data: { type: 'call-ended', call_id: '500', chat_id: '77', user_id: '1' },
    });
  });

  it('still accepts an expiry in milliseconds', async () => {
    const w = worker(); await w.account('1');
    void w.push({ expires_at: Date.now() + 20_000 });
    await w.settle();
    expect(w.shown()[0].body).toBe('Incoming call');
    expect(w.timers[0].delay).toBeGreaterThan(15_000);
  });

  it('replaces the ring on cancel and shows the result for a late ring of that call', async () => {
    const w = worker(); await w.account('1');
    const ringing = w.push({});
    await w.settle();
    await w.push({ action: 'cancel', title: 'Messenger', preview: false, reason: 'missed' });
    expect(w.shown()).toHaveLength(1);
    expect(w.shown()[0]).toMatchObject({ title: 'Alice', body: 'Missed call', requireInteraction: false, data: { type: 'call-ended', reason: 'missed' } });
    w.timers[0].callback();
    await ringing;
    expect(w.shown()[0].body).toBe('Missed call');
    await w.push({});
    expect(w.shown()).toHaveLength(1);
    expect(w.shown()[0]).toMatchObject({ title: 'Alice', body: 'Missed call', requireInteraction: false });
  });

  it('names how the call ended when the cancel says so', async () => {
    const w = worker(); await w.account('1');
    await w.push({ call_id: '600', action: 'cancel', reason: 'answered', title: 'Messenger', preview: false });
    expect(w.shown()[0]).toMatchObject({ title: 'Messenger', tag: 'call-600', body: 'Answered on another device' });
    await w.push({ call_id: '601', action: 'cancel', title: 'Messenger', preview: false });
    expect(w.shown()[1]).toMatchObject({ tag: 'call-601', body: 'Call ended' });
  });

  it('shows a missed call instead of nothing for an expired ring', async () => {
    const w = worker(); await w.account('1', { language: 'ru' });
    await w.push({ call_id: '501', expires_at: seconds(-1_000) });
    expect(w.shown()).toHaveLength(1);
    expect(w.shown()[0]).toMatchObject({ title: 'Alice', tag: 'call-501', body: 'Пропущенный звонок', requireInteraction: false });
    expect(w.timers).toHaveLength(0);
  });

  it('localizes the ring, hides the caller without previews and drops pushes for other accounts like message pushes', async () => {
    const w = worker(); await w.account('1', { language: 'ru' });
    void w.push({ kind: 'group', title: 'Messenger', preview: false });
    await w.settle();
    expect(w.registration.showNotification).toHaveBeenLastCalledWith('Messenger', expect.objectContaining({ body: 'Входящий групповой звонок' }));
    await w.push({ call_id: '502', user_id: '2' });
    await w.push({ call_id: '503', user_id: '2', action: 'cancel' });
    expect(w.registration.showNotification).toHaveBeenCalledTimes(1);
  });

  it('reads the chat of a call from call_chat_id only', async () => {
    const w = worker(); await w.account('1');
    await w.push({ call_id: '504', call_chat_id: undefined, chat_id: '77' });
    await w.push({ call_id: '505', call_chat_id: 'x' });
    expect(w.registration.showNotification).not.toHaveBeenCalled();
  });

  it('opens the chat of the call in the existing window on click', async () => {
    const w = worker(); await w.account('1');
    const notification = { data: { type: 'call', call_id: '500', chat_id: '77', user_id: '1' }, close: vi.fn() };
    await w.dispatch('notificationclick', { notification });
    expect(notification.close).toHaveBeenCalled();
    expect(w.postMessage).toHaveBeenCalledWith({ type: 'open-chat', chatId: '77', notification: true, reply: false });
    expect(w.navigate).not.toHaveBeenCalled();
    expect(w.focus).toHaveBeenCalled();
  });

  it('turns rings whose expiry passed into missed calls on the next push or click', async () => {
    const w = worker(); await w.account('1');
    void w.push({});
    void w.push({ call_id: '501' });
    await w.settle();
    w.shown()[0].data.expires_at = Date.now() - 1;
    await w.dispatch('push', { data: { json: () => null } });
    expect(w.shown().map((n) => [n.tag, n.body])).toEqual([['call-501', 'Incoming call'], ['call-500', 'Missed call']]);
    w.shown()[0].data.expires_at = Date.now() - 1;
    await w.dispatch('notificationclick', { notification: { data: { chat_id: '7', user_id: '1' }, close: vi.fn() } });
    expect(w.shown().map((n) => [n.tag, n.body])).toEqual([['call-500', 'Missed call'], ['call-501', 'Missed call']]);
  });

  it('keeps message notifications working next to calls', async () => {
    const w = worker(); await w.account('1');
    await w.dispatch('push', { data: { json: () => ({ user_id: '1', chat_id: '7', message_id: '9', title: 'Mai', body: 'hi', expires_at: Date.now() / 1000 + 300 }) } });
    expect(w.registration.showNotification).toHaveBeenCalledWith('Messenger', expect.objectContaining({ tag: 'chat-7' }));
  });
});

describe('message text and look', () => {
  it('names attachments in the chosen language instead of English text', async () => {
    const w = worker(); await w.account('1', { api: '/api/v2', language: 'ru' });
    const shownBody = async (extra: Record<string, unknown>) => {
      await w.message({ chat_id: String(extra.message_id), title: 'Mai', preview: true, body: '', ...extra });
      return w.registration.showNotification.mock.lastCall?.[1].body;
    };
    expect(await shownBody({ message_id: '1', content_type: 'photo' })).toBe('Фото');
    expect(await shownBody({ message_id: '2', content_type: 'photo', body: 'Sea' })).toBe('Sea');
    expect(await shownBody({ message_id: '3', content_type: 'voice' })).toBe('Голосовое сообщение');
    expect(await shownBody({ message_id: '4', content_type: 'sticker', body: '😀' })).toBe('😀 Стикер');
    expect(await shownBody({ message_id: '5', content_type: 'album' })).toBe('Альбом');
    expect(await shownBody({ message_id: '6', preview: false, title: 'Messenger' })).toBe('Новое сообщение');
  });
  it('shows a group by its name with each sender on its own line', async () => {
    const w = worker(); await w.account('1', { api: '/api/v2' });
    const group = { chat_type: 'group', chat_title: 'Family', preview: true, avatar_token: 'c.7' };
    await w.message({ ...group, title: 'Mai', body: 'hi', message_id: '1', sender_id: '5' });
    expect(w.registration.showNotification.mock.lastCall).toEqual(['Family', expect.objectContaining({
      body: 'Mai: hi', icon: 'https://chat.test/api/v2/notifications/avatar/c.7',
    })]);
    await w.message({ ...group, title: 'Bob', body: 'yo', message_id: '2', sender_id: '6' });
    expect(w.registration.showNotification.mock.lastCall).toEqual(['Family', expect.objectContaining({ body: 'Bob: yo\nMai: hi' })]);
    await w.message({ ...group, chat_title: undefined, preview: false, title: 'Messenger', message_id: '3' });
    expect(w.registration.showNotification.mock.lastCall).toEqual(['Messenger', expect.objectContaining({ body: '3 new messages', icon: '/pwa-192x192.png' })]);
  });
  it('draws the round photo with the app badge in its corner and reuses it', async () => {
    const drawn: { x: number; y: number; width: number }[] = [];
    const context = {
      save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), closePath: vi.fn(), clip: vi.fn(), arc: vi.fn(), fill: vi.fn(), fillStyle: '',
      drawImage: (_image: unknown, x: number, y: number, width: number) => { drawn.push({ x, y, width }); },
    };
    class FakeCanvas {
      getContext() { return context; }
      async convertToBlob() { return new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/png' } }).blob(); }
    }
    const w = worker({
      OffscreenCanvas: FakeCanvas, createImageBitmap: async () => ({ width: 100, height: 50 }), btoa, Uint8Array, String, Math,
    });
    w.fetch.mockImplementation(async () => new Response(new Uint8Array([0]), { status: 200 }));
    await w.account('1', { api: '/api/v2' });
    await w.message({ title: 'Mai', body: 'hi', message_id: '1', preview: true, sender_id: '5', avatar_token: 'a.5' });
    const icon = w.registration.showNotification.mock.lastCall?.[1].icon;
    expect(icon).toBe(`data:image/png;base64,${btoa(String.fromCharCode(1, 2, 3))}`);
    expect(w.fetch).toHaveBeenCalledWith('https://chat.test/api/v2/notifications/avatar/a.5', expect.objectContaining({ credentials: 'omit' }));
    expect(w.fetch).toHaveBeenCalledWith('https://chat.test/maskable-icon-512x512.png', expect.anything());
    expect(drawn).toHaveLength(2);
    expect(drawn[1].x).toBeGreaterThan(drawn[0].x);
    const fetches = w.fetch.mock.calls.length;
    await w.message({ title: 'Mai', body: 'again', message_id: '2', preview: true, sender_id: '5', avatar_token: 'a.5' });
    expect(w.fetch.mock.calls.length).toBe(fetches);
  });
  it('shows the picture of the newest message and only with previews', async () => {
    const w = worker(); await w.account('1', { api: '/api/v2' });
    await w.message({ title: 'Mai', preview: true, message_id: '1', content_type: 'photo', image_token: 'm.1' });
    expect(w.registration.showNotification.mock.lastCall?.[1].image).toBe('https://chat.test/api/v2/notifications/avatar/m.1');
    await w.message({ title: 'Mai', preview: true, message_id: '2', body: 'and this' });
    expect(w.registration.showNotification.mock.lastCall?.[1].image).toBeUndefined();
    await w.message({ chat_id: '8', title: 'Messenger', preview: false, message_id: '3', image_token: 'm.3' });
    expect(w.registration.showNotification.mock.lastCall?.[1].image).toBeUndefined();
  });
  it('keeps the ten newest messages, newest first, without a counter in the title', async () => {
    const w = worker(); await w.account('1', { api: '/api/v2' });
    for (let id = 1; id <= 12; id += 1) await w.message({ title: 'Mai', preview: true, message_id: String(id), body: `m${id}` });
    const [title, options] = w.registration.showNotification.mock.lastCall!;
    expect(title).toBe('Mai');
    expect(String(options.body).split('\n')).toEqual(['m12', 'm11', 'm10', 'm9', 'm8', 'm7', 'm6', 'm5', 'm4', 'm3']);
  });
  it('falls back to the plain photo when it cannot be drawn', async () => {
    const w = worker({ OffscreenCanvas: class {}, createImageBitmap: async () => { throw new Error('broken'); } });
    w.fetch.mockImplementation(async () => new Response(null, { status: 200 }));
    await w.account('1', { api: '/api/v2' });
    await w.message({ title: 'Mai', body: 'hi', message_id: '1', preview: true, sender_id: '5', avatar_token: 'a.5' });
    expect(w.registration.showNotification.mock.lastCall?.[1].icon).toBe('https://chat.test/api/v2/notifications/avatar/a.5');
  });
});
