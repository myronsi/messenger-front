import { authFetch, getAccessToken, subscribeToAccessToken } from '@/shared/auth/session';
import { getTokenSubject } from '@/shared/auth/tokenClaims';

const STORE_PREFIX = 'media-v1';
const EXPIRES_HEADER = 'X-Media-Expires';
const MAX_STORED = 500;
const MAX_IDLE_ENTRIES = 300;
const MAX_IDLE_BYTES = 64 * 1024 * 1024;
const ATTACHMENT_CONTENT = /\/api\/v2\/attachments\/[^/]+\/content$/;
const USER_AVATAR = /\/api\/v2\/users\/[^/]+\/avatar$/;
const MAX_ACTIVE = 6;
const MAX_ACTIVE_PRELOADS = 1;

type Priority = 'high' | 'low';

interface Slot {
  priority: Priority;
  start: () => void;
}

interface Entry {
  promise: Promise<string>;
  controller: AbortController;
  objectUrl?: string;
  size: number;
  users: number;
  keep: boolean;
  priority: Priority;
  slot?: Slot;
  started: boolean;
}

const entries = new Map<string, Entry>();
const waiting: Slot[] = [];
let active = 0;
let activePreloads = 0;
let generation = 0;
let subject = getTokenSubject(getAccessToken());

const pump = () => {
  while (active < MAX_ACTIVE && waiting.length > 0) {
    const urgent = waiting.findIndex(slot => slot.priority === 'high');
    if (urgent < 0 && activePreloads >= MAX_ACTIVE_PRELOADS) return;
    const [slot] = waiting.splice(urgent < 0 ? waiting.length - 1 : urgent, 1);
    slot.start();
  }
};

const takeSlot = (entry: Entry) => new Promise<() => void>((resolve, reject) => {
  const { signal } = entry.controller;
  if (signal.aborted) { reject(new Error('Media request was cancelled')); return; }
  const slot: Slot = {
    priority: entry.priority,
    start: () => {
      entry.slot = undefined;
      entry.started = true;
      const preload = slot.priority === 'low';
      active += 1;
      if (preload) activePreloads += 1;
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        active -= 1;
        if (preload) activePreloads -= 1;
        pump();
      };
      signal.addEventListener('abort', finish, { once: true });
      resolve(finish);
    },
  };
  entry.slot = slot;
  waiting.push(slot);
  signal.addEventListener('abort', () => {
    const index = waiting.indexOf(slot);
    if (index < 0) return;
    waiting.splice(index, 1);
    reject(new Error('Media request was cancelled'));
  }, { once: true });
  pump();
});

export const isProtectedMedia = (url: string) => {
  try {
    const base = new URL(import.meta.env.VITE_BASE_URL || '/', window.location.href);
    const target = new URL(url, window.location.href);
    return target.origin === base.origin && target.pathname.startsWith('/api/v2/');
  } catch {
    return false;
  }
};

const isStorable = (url: string) => {
  try {
    const { pathname, searchParams } = new URL(url, window.location.href);
    return ATTACHMENT_CONTENT.test(pathname) || (USER_AVATAR.test(pathname) && searchParams.has('rev'));
  } catch {
    return false;
  }
};

const storeName = () => (subject ? `${STORE_PREFIX}:${subject}` : null);

const openStore = () => {
  const name = storeName();
  if (!name || typeof caches === 'undefined') return null;
  return caches.open(name).catch(() => null);
};

const dropStores = (keep: string | null) => {
  if (typeof caches === 'undefined') return;
  void caches.keys()
    .then(names => Promise.all(names.filter(name => name.startsWith(STORE_PREFIX) && name !== keep).map(name => caches.delete(name))))
    .catch(() => undefined);
};

export const storageLifetime = (cacheControl: string | null) => {
  const directives = (cacheControl || '').toLowerCase().split(',').map(part => part.trim());
  if (directives.some(part => part === 'no-store' || part === 'no-cache')) return 0;
  const maxAge = directives.find(part => part.startsWith('max-age='));
  const seconds = maxAge ? Number(maxAge.slice('max-age='.length)) : 0;
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0;
};

const readStored = async (url: string) => {
  const store = await openStore();
  const hit = await store?.match(url).catch(() => undefined);
  if (!hit) return null;
  if (Number(hit.headers.get(EXPIRES_HEADER)) > Date.now()) return hit.blob();
  void store?.delete(url).catch(() => undefined);
  return null;
};

const trimStore = async (store: Cache) => {
  const keys = await store.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_STORED)).map(key => store.delete(key)));
};

const writeStored = async (url: string, blob: Blob, lifetime: number) => {
  const startedIn = generation;
  const store = await openStore();
  if (!store || startedIn !== generation) return;
  await store.put(url, new Response(blob, { headers: { 'Content-Type': blob.type, [EXPIRES_HEADER]: String(Date.now() + lifetime) } }));
  await trimStore(store);
};

const download = async (url: string, entry: Entry) => {
  const storable = isStorable(url);
  const stored = storable ? await readStored(url).catch(() => null) : null;
  if (stored) return stored;
  const done = await takeSlot(entry);
  try {
    const { signal } = entry.controller;
    const response = await authFetch(url, { signal, priority: entry.priority === 'low' ? 'low' : 'auto' });
    if (!response.ok) throw new Error(`Media request failed (${response.status})`);
    const blob = await response.blob();
    const lifetime = storable && response.status === 200 ? storageLifetime(response.headers.get('Cache-Control')) : 0;
    if (lifetime > 0) void writeStored(url, blob, lifetime).catch(() => undefined);
    return blob;
  } finally {
    done();
  }
};

const forget = (url: string, entry: Entry) => {
  if (entries.get(url) !== entry) return;
  entries.delete(url);
  if (entry.objectUrl) URL.revokeObjectURL(entry.objectUrl);
  else entry.controller.abort();
};

const evictIdle = () => {
  let idleCount = 0;
  let idleBytes = 0;
  entries.forEach(entry => {
    if (entry.users === 0 && entry.objectUrl) { idleCount += 1; idleBytes += entry.size; }
  });
  for (const [url, entry] of entries) {
    if (idleCount <= MAX_IDLE_ENTRIES && idleBytes <= MAX_IDLE_BYTES) break;
    if (entry.users > 0 || !entry.objectUrl) continue;
    idleCount -= 1;
    idleBytes -= entry.size;
    forget(url, entry);
  }
};

const touch = (url: string, entry: Entry) => {
  entries.delete(url);
  entries.set(url, entry);
};

const load = (url: string, priority: Priority) => {
  const known = entries.get(url);
  if (known) {
    touch(url, known);
    known.keep ||= priority === 'low';
    if (priority === 'high' && known.priority === 'low') {
      known.priority = 'high';
      if (known.slot) { known.slot.priority = 'high'; pump(); }
    }
    return known;
  }
  const controller = new AbortController();
  const entry: Entry = { controller, size: 0, users: 0, keep: priority === 'low', priority, started: false, promise: Promise.resolve('') };
  entry.promise = download(url, entry).then(blob => {
    if (entries.get(url) !== entry) throw new Error('Media request was cancelled');
    entry.objectUrl = URL.createObjectURL(blob);
    entry.size = blob.size;
    evictIdle();
    return entry.objectUrl;
  });
  entry.promise.catch(() => forget(url, entry));
  entries.set(url, entry);
  return entry;
};

export const peekMedia = (url: string) => {
  const entry = entries.get(url);
  if (!entry?.objectUrl) return undefined;
  touch(url, entry);
  return entry.objectUrl;
};

export const acquireMedia = (url: string) => {
  const entry = load(url, 'high');
  entry.users += 1;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    entry.users -= 1;
    if (entry.users > 0) return;
    if (!entry.objectUrl && !entry.keep) forget(url, entry);
    else evictIdle();
  };
  return { promise: entry.promise, release };
};

export const preloadMedia = (url?: string | null) => {
  if (!url || !isProtectedMedia(url)) return () => undefined;
  const entry = load(url, 'low');
  entry.promise.catch(() => undefined);
  return () => {
    if (!entry.started && !entry.objectUrl && entry.users === 0) forget(url, entry);
  };
};

const forgetAll = () => {
  generation += 1;
  [...entries].forEach(([url, entry]) => forget(url, entry));
};

export const clearMediaCache = () => {
  forgetAll();
  dropStores(null);
};

subscribeToAccessToken(token => {
  const next = getTokenSubject(token);
  if (token && next !== null && next === subject) return;
  subject = token ? next : null;
  forgetAll();
  dropStores(storeName());
});

dropStores(storeName());
