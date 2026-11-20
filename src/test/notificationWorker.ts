import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { vi } from 'vitest';

export function notificationWorker(withWindow = true, globals: Record<string, unknown> = {}) {
  const events: Record<string, (event: unknown) => void> = {};
  const storage = new Map<string, Response>();
  const close = vi.fn();
  let shown: ({ tag: string; data: unknown; close: () => void } & Record<string, unknown>)[] = [];
  const registration = {
    showNotification: vi.fn(async (title: string, options: NotificationOptions & { tag: string; actions?: { action: string; title: string }[] }) => {
      shown = [...shown.filter((n) => n.tag !== options.tag), { ...options, title, tag: options.tag, data: options.data, close }];
    }),
    getNotifications: async (filter?: { tag?: string }) => (shown.length || filter ? shown : [{ tag: '', data: null, close }])
      .filter((n) => !filter?.tag || n.tag === filter.tag),
  };
  const navigate = vi.fn(); const focus = vi.fn(); const openWindow = vi.fn(); const postMessage = vi.fn();
  const fetch = vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 204 }));
  runInNewContext(readFileSync('public/notification-worker.js', 'utf8'), {
    URL, Response, Date, fetch, encodeURIComponent, ...globals,
    caches: { open: async () => ({
      put: async (key: string, value: Response) => storage.set(key, value),
      match: async (key: string) => storage.get(key)?.clone(),
    }) },
    self: {
      location: { origin: 'https://chat.test' }, registration,
      addEventListener: (type: string, callback: (event: unknown) => void) => { events[type] = callback; },
      clients: { openWindow, matchAll: async () => (withWindow ? [{ url: 'https://chat.test/', navigate, focus, postMessage }] : []) },
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
