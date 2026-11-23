import { trimEndChars } from '@/shared/lib/trimChars';

const DB_NAME = 'messenger-device';
const STORE = 'keys';
const KEY_ID = 'device';
const LOCK_NAME = 'device-key';

export const DEVICE_PROOF_HEADER = 'Device-Proof';

interface StoredDeviceKey {
  id: string;
  keys: CryptoKeyPair;
}

interface DeviceKey {
  keys: CryptoKeyPair;
  header: string;
}

let deviceKey: Promise<DeviceKey | null> | null = null;
let keyQueue: Promise<unknown> = Promise.resolve();
let clockOffsetMs = 0;

const encoder = new TextEncoder();

const base64Url = (bytes: Uint8Array) => {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return trimEndChars(btoa(binary).replace(/\+/g, '-').replace(/\//g, '_'), '=');
};

const base64UrlJson = (value: unknown) => base64Url(encoder.encode(JSON.stringify(value)));

const isSupported = () => typeof indexedDB !== 'undefined' &&
  typeof crypto !== 'undefined' &&
  typeof crypto.subtle?.generateKey === 'function' &&
  typeof crypto.randomUUID === 'function';

const request = <T,>(run: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  run.onsuccess = () => resolve(run.result);
  run.onerror = () => reject(run.error instanceof Error ? run.error : new Error('IndexedDB request failed'));
});

const openDb = () => {
  const opening = indexedDB.open(DB_NAME, 1);
  opening.onupgradeneeded = () => {
    if (!opening.result.objectStoreNames.contains(STORE)) opening.result.createObjectStore(STORE, { keyPath: 'id' });
  };
  return request(opening);
};

const withStore = async <T,>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) => {
  const db = await openDb();
  try {
    return await request(run(db.transaction(STORE, mode).objectStore(STORE)));
  } finally {
    db.close();
  }
};

const withKeyLock = <T,>(task: () => Promise<T>): Promise<T> => {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  const run = keyQueue.then(async (): Promise<T> => (locks?.request ? locks.request(LOCK_NAME, task) : task()));
  keyQueue = run.catch(() => undefined);
  return run;
};

const proofHeader = async (publicKey: CryptoKey) => {
  const { kty, crv, x, y } = await crypto.subtle.exportKey('jwk', publicKey);
  return base64UrlJson({ typ: 'dpop+jwt', alg: 'ES256', jwk: { kty, crv, x, y } });
};

const loadOrCreateKeys = async () => {
  const stored = await withStore<StoredDeviceKey | undefined>('readonly', (store) => store.get(KEY_ID));
  if (stored?.keys?.privateKey && stored.keys.publicKey) return stored.keys;
  const keys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  await withStore('readwrite', (store) => store.put({ id: KEY_ID, keys } satisfies StoredDeviceKey));
  return keys;
};

const loadDeviceKey = async (): Promise<DeviceKey> => {
  const keys = await withKeyLock(loadOrCreateKeys);
  return { keys, header: await proofHeader(keys.publicKey) };
};

const ensureDeviceKey = async () => {
  if (!isSupported()) return null;
  const pending = deviceKey ?? loadDeviceKey().catch(() => null);
  deviceKey = pending;
  const loaded = await pending;
  if (!loaded && deviceKey === pending) deviceKey = null;
  return loaded;
};

export const getOrCreateDeviceKey = async () => (await ensureDeviceKey())?.keys ?? null;

const proofUrl = (url: string) => {
  const target = new URL(url, typeof location === 'undefined' ? undefined : location.href);
  target.search = '';
  target.hash = '';
  return target.href;
};

export const createDeviceProof = async (method: string, url: string) => {
  try {
    const loaded = await ensureDeviceKey();
    if (!loaded) return null;
    const payload = base64UrlJson({
      htm: method.toUpperCase(),
      htu: proofUrl(url),
      iat: Math.floor((Date.now() + clockOffsetMs) / 1000),
      jti: crypto.randomUUID(),
    });
    const input = `${loaded.header}.${payload}`;
    const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, loaded.keys.privateKey, encoder.encode(input));
    return `${input}.${base64Url(new Uint8Array(signature))}`;
  } catch {
    return null;
  }
};

export const adjustDeviceClock = (serverDate: string | null) => {
  const serverTime = serverDate ? Date.parse(serverDate) : Number.NaN;
  if (!Number.isFinite(serverTime)) return false;
  clockOffsetMs = serverTime - Date.now();
  return true;
};

export const forgetCachedDeviceKey = () => {
  deviceKey = null;
};

export const forgetDeviceKey = async () => {
  deviceKey = null;
  if (!isSupported()) return;
  try {
    await withKeyLock(async () => {
      deviceKey = null;
      await withStore('readwrite', (store) => store.delete(KEY_ID));
    });
  } catch {
    return;
  }
};
