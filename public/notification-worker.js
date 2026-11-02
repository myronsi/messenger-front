/* Loaded by the generated app service worker. Keep notification account state across worker restarts. */
const notificationCache = 'messenger-notification-account';
const accountKey = new URL('/__notification_account', self.location.origin).href;
const settingsKey = new URL('/__notification_settings', self.location.origin).href;
const MAX_LINES = 5;
const ACTION_TITLES = {
  en: { reply: 'Reply', read: 'Mark as read' },
  ru: { reply: 'Ответить', read: 'Прочитано' },
};
async function notificationAccount() {
  const cache = await caches.open(notificationCache);
  const response = await cache.match(accountKey);
  return response ? await response.text() : '';
}
async function notificationSettings() {
  const cache = await caches.open(notificationCache);
  const response = await cache.match(settingsKey);
  try { return response ? await response.json() : {}; } catch { return {}; }
}
function apiUrl(api, path) {
  try {
    const base = new URL(api);
    if (base.protocol !== 'https:' && base.protocol !== 'http:') return null;
    let href = base.href;
    while (href.endsWith('/')) href = href.slice(0, -1);
    return `${href}${path}`;
  } catch { return null; }
}
self.addEventListener('message', (event) => {
  if (event.origin !== self.location.origin || event.data?.type !== 'notification-account') return;
  event.waitUntil((async () => {
    const cache = await caches.open(notificationCache);
    const previous = await notificationAccount();
    const next = String(event.data.user || '');
    await cache.put(accountKey, new Response(next));
    await cache.put(settingsKey, new Response(JSON.stringify({
      api: typeof event.data.api === 'string' ? event.data.api : '',
      language: event.data.language === 'ru' ? 'ru' : 'en',
    })));
    if (!next || previous !== next) {
      for (const notification of await self.registration.getNotifications()) notification.close();
    }
  })());
});
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let data;
    try { data = event.data.json(); } catch { return; }
    if (!data || String(data.user_id) !== await notificationAccount() || !/^\d+$/.test(String(data.chat_id))) return;
    if (!Number.isFinite(data.expires_at) || data.expires_at * 1000 < Date.now()) return;
    const tag = `chat-${data.chat_id}`;
    const settings = await notificationSettings();
    const previous = (await self.registration.getNotifications({ tag })).find((n) => n.data?.user_id === String(data.user_id));
    const count = (Number(previous?.data?.count) || 0) + 1;
    const line = String(data.body || 'New message');
    const lines = [...(Array.isArray(previous?.data?.lines) ? previous.data.lines : []), line].slice(-MAX_LINES);
    const title = String(data.title || 'Messenger');
    const avatar = typeof data.avatar_token === 'string' && settings.api
      ? apiUrl(settings.api, `/notifications/avatar/${encodeURIComponent(data.avatar_token)}`) : null;
    const readToken = typeof data.read_token === 'string' ? data.read_token : '';
    const titles = ACTION_TITLES[settings.language] || ACTION_TITLES.en;
    const actions = [{ action: 'reply', title: titles.reply }];
    if (readToken && settings.api) actions.push({ action: 'read', title: titles.read });
    await self.registration.showNotification(count > 1 ? `${title} (${count})` : title, {
      body: lines.join('\n'), icon: avatar || '/pwa-192x192.png', badge: '/pwa-64x64.png',
      tag, renotify: false, silent: !data.sound, actions,
      data: { chat_id: String(data.chat_id), user_id: String(data.user_id), read_token: readToken, lines, count },
    });
  })());
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const data = event.notification.data;
    if (!data || data.user_id !== await notificationAccount() || !/^\d+$/.test(data.chat_id)) return;
    if (event.action === 'read') {
      const settings = await notificationSettings();
      const url = data.read_token && settings.api ? apiUrl(settings.api, `/notifications/read/${encodeURIComponent(data.read_token)}`) : null;
      if (url) await fetch(url, { method: 'POST', credentials: 'omit' }).catch(() => undefined);
      return;
    }
    const url = new URL(`/chat/${data.chat_id}?notification=1`, self.location.origin).href;
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    let client = existing;
    if (existing) { client = await existing.navigate(url) || existing; await client.focus(); }
    else client = await self.clients.openWindow(url);
    if (event.action === 'reply' && client) client.postMessage({ type: 'notification-reply', chat_id: data.chat_id });
  })());
});
