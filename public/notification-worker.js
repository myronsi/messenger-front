/* Loaded by the generated app service worker. Keep notification account state across worker restarts. */
const notificationCache = 'messenger-notification-account';
const accountKey = new URL('/__notification_account', self.location.origin).href;
const settingsKey = new URL('/__notification_settings', self.location.origin).href;
const MAX_LINES = 10;
const MAX_IDS = 200;
const ACTION_TITLES = {
  en: {
    reply: 'Reply', read: 'Mark as read', many: (n) => `${n} new messages`, call: 'Incoming call', groupCall: 'Incoming group call',
    missed: 'Missed call', ended: 'Call ended', answered: 'Answered on another device',
    birthday: (name) => `${name} has a birthday today`, someoneBirthday: 'Someone you chat with has a birthday today',
    newMessage: 'New message', photo: 'Photo', video: 'Video', audio: 'Audio', voice: 'Voice message', file: 'File', album: 'Album',
    sticker: 'Sticker',
  },
  ru: {
    reply: 'Ответить', read: 'Прочитано', many: (n) => `Новых сообщений: ${n}`, call: 'Входящий звонок', groupCall: 'Входящий групповой звонок',
    missed: 'Пропущенный звонок', ended: 'Звонок завершён', answered: 'Принят на другом устройстве',
    birthday: (name) => `У ${name} сегодня день рождения`, someoneBirthday: 'У одного из собеседников сегодня день рождения',
    newMessage: 'Новое сообщение', photo: 'Фото', video: 'Видео', audio: 'Аудио', voice: 'Голосовое сообщение', file: 'Файл', album: 'Альбом',
    sticker: 'Стикер',
  },
  es: {
    reply: 'Responder', read: 'Marcar como leído', many: (n) => `${n} mensajes nuevos`, call: 'Llamada entrante', groupCall: 'Llamada grupal entrante',
    missed: 'Llamada perdida', ended: 'Llamada finalizada', answered: 'Respondida en otro dispositivo',
    birthday: (name) => `${name} cumple años hoy`, someoneBirthday: 'Alguien con quien chateas cumple años hoy',
    newMessage: 'Nuevo mensaje', photo: 'Foto', video: 'Vídeo', audio: 'Audio', voice: 'Mensaje de voz', file: 'Archivo', album: 'Álbum',
    sticker: 'Sticker',
  },
  de: {
    reply: 'Antworten', read: 'Als gelesen markieren', many: (n) => `${n} neue Nachrichten`, call: 'Eingehender Anruf', groupCall: 'Eingehender Gruppenanruf',
    missed: 'Verpasster Anruf', ended: 'Anruf beendet', answered: 'Auf einem anderen Gerät angenommen',
    birthday: (name) => `${name} hat heute Geburtstag`, someoneBirthday: 'Jemand, mit dem du schreibst, hat heute Geburtstag',
    newMessage: 'Neue Nachricht', photo: 'Foto', video: 'Video', audio: 'Audio', voice: 'Sprachnachricht', file: 'Datei', album: 'Album',
    sticker: 'Sticker',
  },
};
const CALL_MAX_RING_MS = 120000;
const cancelledCalls = new Map();
const CALL_REASONS = new Set(['missed', 'declined', 'answered', 'ended']);
const chatQueues = new Map();
const readUpTo = new Map();
const CONTENT_LABELS = new Set(['photo', 'video', 'audio', 'voice', 'file', 'album', 'sticker']);
const APP_ICON = '/pwa-192x192.png';
const BADGE_SOURCE = '/maskable-icon-512x512.png';
const ICON_SIZE = 192;
const ICON_LIFETIME_MS = 10 * 60 * 1000;
const ICON_CACHE_LIMIT = 64;
const icons = new Map();
function titlesFor(settings) {
  return ACTION_TITLES[settings.language] || ACTION_TITLES.en;
}
function messageText(data, titles, preview) {
  if (!preview) return titles.newMessage;
  const body = typeof data.body === 'string' ? data.body : '';
  const type = String(data.content_type || '');
  if (!CONTENT_LABELS.has(type)) return body || titles.newMessage;
  if (type === 'sticker') return body ? `${body} ${titles.sticker}` : titles.sticker;
  if (type === 'voice') return titles.voice;
  return body || titles[type];
}
function avatarUrl(data, settings) {
  return typeof data.avatar_token === 'string' && data.avatar_token && settings.api
    ? apiUrl(settings.api, `/notifications/avatar/${encodeURIComponent(data.avatar_token)}`) : null;
}
async function bitmap(url) {
  const response = await fetch(url, { credentials: 'omit' });
  if (!response.ok) throw new Error('image unavailable');
  return createImageBitmap(await response.blob());
}
function drawCircle(context, image, x, y, radius) {
  context.save();
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.closePath();
  context.clip();
  const scale = Math.max((radius * 2) / image.width, (radius * 2) / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  context.drawImage(image, x - width / 2, y - height / 2, width, height);
  context.restore();
}
async function toDataUrl(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${blob.type || 'image/png'};base64,${btoa(binary)}`;
}
async function composeIcon(url) {
  const [avatar, badge] = await Promise.all([bitmap(url), bitmap(new URL(BADGE_SOURCE, self.location.origin).href)]);
  const canvas = new OffscreenCanvas(ICON_SIZE, ICON_SIZE);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas unavailable');
  drawCircle(context, avatar, 90, 90, 90);
  context.beginPath();
  context.arc(158, 158, 34, 0, Math.PI * 2);
  context.fillStyle = '#ffffff';
  context.fill();
  drawCircle(context, badge, 158, 158, 30);
  return toDataUrl(await canvas.convertToBlob({ type: 'image/png' }));
}
async function notificationIcon(url, key) {
  if (!url) return APP_ICON;
  if (typeof OffscreenCanvas !== 'function' || typeof createImageBitmap !== 'function') return url;
  const now = Date.now();
  const cached = icons.get(key);
  if (cached && now - cached.at < ICON_LIFETIME_MS) return cached.icon;
  try {
    const icon = await composeIcon(url);
    icons.delete(key);
    icons.set(key, { icon, at: now });
    if (icons.size > ICON_CACHE_LIMIT) icons.delete(icons.keys().next().value);
    return icon;
  } catch {
    return url;
  }
}
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
    language: ACTION_TITLES[data.language] ? data.language : previous.language || 'en',
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
function newerId(a, b) {
  if (!b) return true;
  if (!a) return false;
  return a.length !== b.length ? a.length > b.length : a > b;
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
    event.waitUntil(inChatOrder('settings', () => notificationSettings().then((previous) => saveSettings(event.data, previous))));
    return;
  }
  if (event.data?.type !== 'notification-account') return;
  event.waitUntil(inChatOrder('settings', async () => {
    const cache = await caches.open(notificationCache);
    const previous = await notificationAccount();
    const next = String(event.data.user || '');
    await cache.put(accountKey, new Response(next));
    await saveSettings(event.data);
    if (!next || previous !== next) {
      icons.clear();
      for (const notification of await self.registration.getNotifications()) notification.close();
    }
  }));
});
function stackedLine(entry, fallback) {
  if (entry && typeof entry === 'object') {
    const from = String(entry.from || '');
    return { from, sender: String(entry.sender || from), text: String(entry.text || '') };
  }
  return { from: fallback, sender: fallback, text: String(entry || '') };
}
async function showBirthdayNotification(data) {
  const user = String(data.user_id);
  const settings = await notificationSettings();
  const titles = titlesFor(settings);
  const preview = data.preview === true && typeof data.title === 'string' && data.title;
  const icon = await notificationIcon(preview ? avatarUrl(data, settings) : null, `${user}:user:${data.sender_id}`);
  if (user !== await notificationAccount()) return;
  await self.registration.showNotification(preview ? data.title : 'Messenger', {
    body: preview ? titles.birthday(data.title) : titles.someoneBirthday,
    icon, badge: '/pwa-64x64.png', tag: `birthday-${data.chat_id}`, renotify: false, silent: !data.sound,
    data: { chat_id: String(data.chat_id), user_id: user, kind: 'birthday' },
  });
}
async function showChatNotification(data) {
  const tag = `chat-${data.chat_id}`;
  const user = String(data.user_id);
  const settings = await notificationSettings();
  const previous = (await self.registration.getNotifications({ tag })).find((n) => n.data?.user_id === user);
  const before = previous?.data || {};
  const messageId = /^\d+$/.test(String(data.message_id)) ? String(data.message_id) : '';
  const readMark = readUpTo.get(`${user}:${data.chat_id}`);
  if (messageId && readMark && !newerId(messageId, readMark)) return;
  const ids = Array.isArray(before.ids) ? before.ids : [];
  const evicted = !!messageId && ids.length >= MAX_IDS && ids.every((id) => newerId(String(id), messageId));
  const repeated = !!messageId && (ids.includes(messageId) || evicted);
  if (repeated && previous && !(before.preview === true && data.preview !== true)) {
    if (user !== await notificationAccount()) return;
    await self.registration.showNotification(previous.title, {
      body: previous.body, icon: previous.icon, badge: previous.badge, tag, ...(previous.image ? { image: previous.image } : {}),
      renotify: false, silent: true, actions: previous.actions, data: before,
    });
    return;
  }
  const preview = data.preview === true && !(before.preview === false && !newerId(messageId, String(before.newest_id || '')));
  const keepLines = preview && before.preview === true;
  const count = repeated ? Number(before.count) || 1 : (Number(before.count) || 0) + 1;
  const titles = titlesFor(settings);
  const from = preview ? String(data.title || 'Messenger') : 'Messenger';
  const sender = preview && /^\d+$/.test(String(data.sender_id)) ? `id:${data.sender_id}` : from;
  const line = { from, sender, text: messageText(data, titles, preview) };
  const earlier = keepLines && Array.isArray(before.lines) ? before.lines.map((entry) => stackedLine(entry, String(before.from || from))) : [];
  const lines = repeated ? earlier : [...earlier, line].slice(-MAX_LINES);
  const shown = lines.length ? lines : [line];
  const group = preview && data.chat_type === 'group' && typeof data.chat_title === 'string' && data.chat_title ? data.chat_title : '';
  const oneSender = !group && shown.every((entry) => entry.sender === sender);
  const title = group || from;
  const newestFirst = [...shown].reverse();
  const body = !preview ? (count > 1 ? titles.many(count) : titles.newMessage)
    : newestFirst.map((entry) => (oneSender ? entry.text : `${entry.from}: ${entry.text}`)).join('\n');
  const iconKey = group ? `${user}:chat:${data.chat_id}` : `${user}:user:${data.sender_id}`;
  const icon = await notificationIcon((group || oneSender) && preview ? avatarUrl(data, settings) : null, iconKey);
  const incomingToken = !repeated && typeof data.read_token === 'string' ? data.read_token : '';
  const takeToken = !!incomingToken && (!before.read_token || newerId(messageId, String(before.read_message_id || '')));
  const readToken = takeToken ? incomingToken : before.read_token || '';
  const readMessageId = takeToken ? messageId : String(before.read_message_id || '');
  const actions = [{ action: 'reply', title: titles.reply }];
  const newestId = messageId && newerId(messageId, String(before.newest_id || '')) ? messageId : String(before.newest_id || messageId);
  if (readToken && settings.api && readMessageId === newestId) actions.push({ action: 'read', title: titles.read });
  const imageToken = preview && typeof data.image_token === 'string' ? data.image_token : '';
  const freshImage = imageToken && settings.api ? apiUrl(settings.api, `/notifications/avatar/${encodeURIComponent(imageToken)}`) : '';
  const image = !preview ? '' : messageId === newestId ? freshImage || '' : String(before.image || '');
  if (user !== await notificationAccount()) return;
  await self.registration.showNotification(title, {
    body, icon, badge: '/pwa-64x64.png', ...(image ? { image } : {}),
    tag, renotify: false, silent: repeated || !data.sound, actions,
    data: {
      chat_id: String(data.chat_id), user_id: user, read_token: readToken, read_message_id: readMessageId, lines, count, preview, from,
      chat_title: group, image,
      newest_id: newestId,
      ids: repeated || !messageId ? ids : [...ids, messageId].sort((a, b) => (a === b ? 0 : newerId(String(a), String(b)) ? 1 : -1)).slice(-MAX_IDS),
    },
  });
}
function callExpiry(value) {
  if (!Number.isFinite(value)) return 0;
  return value > 1e12 ? value : value * 1000;
}
function rememberCancel(callId, reason) {
  cancelledCalls.delete(callId);
  cancelledCalls.set(callId, reason);
  if (cancelledCalls.size > 200) cancelledCalls.delete(cancelledCalls.keys().next().value);
}
async function ringLook(data, settings) {
  const preview = data.preview === true;
  const icon = await notificationIcon(preview ? avatarUrl(data, settings) : null, `${data.user_id}:user:${data.sender_id}`);
  return { title: preview ? String(data.title || 'Messenger') : 'Messenger', icon };
}
function endedText(titles, reason) {
  if (reason === 'answered') return titles.answered;
  if (reason === 'missed' || reason === 'declined') return titles.missed;
  return titles.ended;
}
async function ringNotification(callId) {
  return (await self.registration.getNotifications({ tag: `call-${callId}` })).find((n) => n.data?.type === 'call' && n.data.call_id === callId);
}
async function showCallEnded(call, reason) {
  const settings = await notificationSettings();
  const titles = ACTION_TITLES[settings.language] || ACTION_TITLES.en;
  const ring = await ringNotification(call.callId);
  if (call.user !== await notificationAccount()) return;
  await self.registration.showNotification(ring?.title || call.title || 'Messenger', {
    body: endedText(titles, reason), icon: ring?.icon || call.icon || '/pwa-192x192.png', badge: '/pwa-64x64.png',
    tag: `call-${call.callId}`, renotify: false, requireInteraction: false, silent: true,
    data: { type: 'call-ended', call_id: call.callId, chat_id: call.chatId, user_id: call.user, reason },
  });
}
function inCallOrder(callId, task) {
  return inChatOrder(`call-${callId}`, task);
}
async function replaceExpiredRings() {
  const now = Date.now();
  const account = await notificationAccount();
  const expired = (await self.registration.getNotifications()).filter((n) => n.data?.type === 'call' && Number(n.data.expires_at) <= now);
  await Promise.all(expired.map((notification) => {
    const data = notification.data;
    if (data.user_id !== account) { notification.close(); return undefined; }
    const call = { callId: String(data.call_id), chatId: String(data.chat_id), user: String(data.user_id) };
    return inCallOrder(call.callId, async () => {
      if (await ringNotification(call.callId)) await showCallEnded(call, cancelledCalls.get(call.callId) || 'missed');
    });
  }));
}
async function handleCallPush(data) {
  const callId = String(data.call_id);
  const chatId = String(data.call_chat_id);
  if (!/^\d+$/.test(callId) || !/^\d+$/.test(chatId)) return;
  const call = { callId, chatId, user: String(data.user_id) };
  if (data.action === 'cancel') {
    const reason = CALL_REASONS.has(data.reason) ? data.reason : 'cancelled';
    rememberCancel(callId, reason);
    await inCallOrder(callId, () => showCallEnded(call, reason));
    return;
  }
  if (data.action !== 'ring') return;
  const settings = await notificationSettings();
  const titles = ACTION_TITLES[settings.language] || ACTION_TITLES.en;
  const look = await ringLook(data, settings);
  const expiresAt = callExpiry(data.expires_at);
  const remaining = expiresAt - Date.now();
  const ringing = await inCallOrder(callId, async () => {
    if (remaining <= 0 || cancelledCalls.has(callId)) {
      await showCallEnded({ ...call, ...look }, cancelledCalls.get(callId) || 'missed');
      return false;
    }
    if (call.user !== await notificationAccount()) return false;
    await self.registration.showNotification(look.title, {
      body: data.kind === 'group' ? titles.groupCall : titles.call,
      icon: look.icon, badge: '/pwa-64x64.png', tag: `call-${callId}`,
      renotify: true, requireInteraction: true, silent: false,
      data: { type: 'call', call_id: callId, chat_id: chatId, user_id: call.user, expires_at: expiresAt },
    });
    return true;
  });
  if (!ringing) return;
  await new Promise((resolve) => { setTimeout(resolve, Math.min(remaining, CALL_MAX_RING_MS)); });
  await inCallOrder(callId, async () => {
    if (!cancelledCalls.has(callId)) await showCallEnded({ ...call, ...look }, 'missed');
  });
}
self.addEventListener('push', (event) => {
  event.waitUntil(Promise.all([replaceExpiredRings().catch(() => undefined), (async () => {
    let data;
    try { data = event.data.json(); } catch { return; }
    if (!data || String(data.user_id) !== await notificationAccount()) return;
    if (data.type === 'call') {
      await handleCallPush(data);
      return;
    }
    if (!/^\d+$/.test(String(data.chat_id))) return;
    if (!Number.isFinite(data.expires_at) || data.expires_at * 1000 < Date.now()) return;
    if (data.kind === 'birthday') {
      await showBirthdayNotification(data);
      return;
    }
    await inChatOrder(String(data.chat_id), () => showChatNotification(data));
  })()]));
});
async function markRead(notification) {
  const data = notification.data;
  const settings = await notificationSettings();
  const url = data.read_token && settings.api ? apiUrl(settings.api, `/notifications/read/${encodeURIComponent(data.read_token)}`) : null;
  const response = url ? await fetch(url, { method: 'POST', credentials: 'omit' }).catch(() => null) : null;
  if (response?.ok) {
    const key = `${data.user_id}:${data.chat_id}`;
    const mark = String(data.read_message_id || '');
    if (mark && newerId(mark, readUpTo.get(key) || '')) readUpTo.set(key, mark);
    return;
  }
  const expired = response?.status === 404;
  if (data.user_id !== await notificationAccount()) return;
  if ((await self.registration.getNotifications({ tag: notification.tag })).length) return;
  await self.registration.showNotification(notification.title, {
    body: notification.body, icon: notification.icon, badge: notification.badge, tag: notification.tag,
    renotify: false, silent: true,
    actions: expired ? (notification.actions || []).filter((action) => action.action !== 'read') : notification.actions,
    data: expired ? { ...data, read_token: '' } : data,
  });
}
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(Promise.all([replaceExpiredRings().catch(() => undefined), (async () => {
    const data = event.notification.data;
    if (!data || data.user_id !== await notificationAccount() || !/^\d+$/.test(data.chat_id)) return;
    if (event.action === 'read') {
      await inChatOrder(data.chat_id, () => markRead(event.notification));
      return;
    }
    const reply = event.action === 'reply';
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) {
      existing.postMessage({ type: 'open-chat', chatId: String(data.chat_id), notification: true, reply });
      await existing.focus();
      return;
    }
    await self.clients.openWindow(new URL(`/chat/${data.chat_id}?notification=1${reply ? '&reply=1' : ''}`, self.location.origin).href);
  })()]));
});
