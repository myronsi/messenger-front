/* Loaded by the generated app service worker. Keep notification account state across worker restarts. */
const notificationCache = 'messenger-notification-account';
const accountKey = new URL('/__notification_account', self.location.origin).href;
const settingsKey = new URL('/__notification_settings', self.location.origin).href;
const MAX_LINES = 5;
const MAX_IDS = 50;
const ACTION_TITLES = {
  en: { reply: 'Reply', read: 'Mark as read' },
  ru: { reply: 'Ответить', read: 'Прочитано' },
};
const chatQueues = new Map();
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
async function saveSettings(data, previous = {}) {
  const cache = await caches.open(notificationCache);
  await cache.put(settingsKey, new Response(JSON.stringify({
    api: typeof data.api === 'string' ? data.api : previous.api || '',
    language: data.language === 'ru' || data.language === 'en' ? data.language : previous.language || 'en',
  })));
}
function apiUrl(api, path) {
  try {
    const base = new URL(api, self.location.origin);
    if (base.protocol !== 'https:' && base.protocol !== 'http:') return null;
    let href = base.href;
    while (href.endsWith('/')) href = href.slice(0, -1);
    return `${href}${path}`;
  } catch { return null; }
}
function inChatOrder(chatId, task) {
  const run = (chatQueues.get(chatId) || Promise.resolve()).then(task, task);
  const tail = run.catch(() => undefined);
  chatQueues.set(chatId, tail);
  tail.then(() => { if (chatQueues.get(chatId) === tail) chatQueues.delete(chatId); });
  return run;
}
self.addEventListener('message', (event) => {
  if (event.origin !== self.location.origin) return;
  if (event.data?.type === 'notification-settings') {
    event.waitUntil(notificationSettings().then((previous) => saveSettings(event.data, previous)));
    return;
  }
  if (event.data?.type !== 'notification-account') return;
  event.waitUntil((async () => {
    const cache = await caches.open(notificationCache);
    const previous = await notificationAccount();
    const next = String(event.data.user || '');
    await cache.put(accountKey, new Response(next));
    await saveSettings(event.data);
    if (!next || previous !== next) {
      for (const notification of await self.registration.getNotifications()) notification.close();
    }
  })());
});
async function showChatNotification(data) {
  const tag = `chat-${data.chat_id}`;
  const settings = await notificationSettings();
  const previous = (await self.registration.getNotifications({ tag })).find((n) => n.data?.user_id === String(data.user_id));
  const before = previous?.data || {};
  const messageId = /^\d+$/.test(String(data.message_id)) ? String(data.message_id) : '';
  const ids = Array.isArray(before.ids) ? before.ids : [];
  const repeated = !!messageId && ids.includes(messageId);
  const preview = data.preview !== false;
  const keepLines = preview && before.preview !== false;
  const count = repeated ? Number(before.count) || 1 : (Number(before.count) || 0) + 1;
  const line = String(data.body || 'New message');
  const earlier = keepLines && Array.isArray(before.lines) ? before.lines : [];
  const lines = repeated ? earlier : [...earlier, line].slice(-MAX_LINES);
  const title = String(data.title || 'Messenger');
  const avatar = preview && typeof data.avatar_token === 'string' && settings.api
    ? apiUrl(settings.api, `/notifications/avatar/${encodeURIComponent(data.avatar_token)}`) : null;
  const readToken = repeated ? before.read_token || '' : typeof data.read_token === 'string' ? data.read_token : '';
  const titles = ACTION_TITLES[settings.language] || ACTION_TITLES.en;
  const actions = [{ action: 'reply', title: titles.reply }];
  if (readToken && settings.api) actions.push({ action: 'read', title: titles.read });
  await self.registration.showNotification(count > 1 ? `${title} (${count})` : title, {
    body: (lines.length ? lines : [line]).join('\n'), icon: avatar || '/pwa-192x192.png', badge: '/pwa-64x64.png',
    tag, renotify: false, silent: repeated || !data.sound, actions,
    data: {
      chat_id: String(data.chat_id), user_id: String(data.user_id), read_token: readToken, lines, count, preview,
      ids: repeated || !messageId ? ids : [...ids, messageId].slice(-MAX_IDS),
    },
  });
}
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let data;
    try { data = event.data.json(); } catch { return; }
    if (!data || String(data.user_id) !== await notificationAccount() || !/^\d+$/.test(String(data.chat_id))) return;
    if (!Number.isFinite(data.expires_at) || data.expires_at * 1000 < Date.now()) return;
    await inChatOrder(String(data.chat_id), () => showChatNotification(data));
  })());
});
async function markRead(notification) {
  const data = notification.data;
  const settings = await notificationSettings();
  const url = data.read_token && settings.api ? apiUrl(settings.api, `/notifications/read/${encodeURIComponent(data.read_token)}`) : null;
  const response = url ? await fetch(url, { method: 'POST', credentials: 'omit' }).catch(() => null) : null;
  if (response?.ok || response?.status === 404) return;
  await self.registration.showNotification(notification.title, {
    body: notification.body, icon: notification.icon, badge: notification.badge, tag: notification.tag,
    renotify: false, silent: true, actions: notification.actions, data,
  });
}
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const data = event.notification.data;
    if (!data || data.user_id !== await notificationAccount() || !/^\d+$/.test(data.chat_id)) return;
    if (event.action === 'read') {
      await inChatOrder(data.chat_id, () => markRead(event.notification));
      return;
    }
    const reply = event.action === 'reply' ? '&reply=1' : '';
    const url = new URL(`/chat/${data.chat_id}?notification=1${reply}`, self.location.origin).href;
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) { await existing.navigate(url); await existing.focus(); }
    else await self.clients.openWindow(url);
  })());
});
