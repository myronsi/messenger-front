/* Loaded by the generated app service worker. Keep notification account state across worker restarts. */
const notificationCache = 'messenger-notification-account';
const accountKey = new URL('/__notification_account', self.location.origin).href;
async function notificationAccount() {
  const cache = await caches.open(notificationCache);
  const response = await cache.match(accountKey);
  return response ? await response.text() : '';
}
self.addEventListener('message', (event) => {
  if (event.origin !== self.location.origin || event.data?.type !== 'notification-account') return;
  event.waitUntil((async () => {
    const cache = await caches.open(notificationCache);
    const previous = await notificationAccount();
    const next = String(event.data.user || '');
    await cache.put(accountKey, new Response(next));
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
    await self.registration.showNotification(data.title || 'Messenger', {
      body: data.body || 'New message', icon: '/pwa-192x192.png', badge: '/pwa-64x64.png',
      tag: `chat-${data.chat_id}`, renotify: false, silent: !data.sound,
      data: { chat_id: String(data.chat_id), user_id: String(data.user_id) },
    });
  })());
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const data = event.notification.data;
    if (!data || data.user_id !== await notificationAccount() || !/^\d+$/.test(data.chat_id)) return;
    const url = new URL(`/chat/${data.chat_id}?notification=1`, self.location.origin).href;
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) { await existing.navigate(url); await existing.focus(); }
    else await self.clients.openWindow(url);
  })());
});
