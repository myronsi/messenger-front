import { toBase64Url } from './encoding';

const DB_NAME = 'messenger-calls';
const STORE = 'identities';

interface StoredIdentity {
  id: string;
  user: string;
  keys: CryptoKeyPair;
}

export interface CallIdentity {
  keys: CryptoKeyPair;
  publicKey: string;
}

export const generateIdentityKeys = () => crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);

export const exportIdentityKey = async (publicKey: CryptoKey) => toBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', publicKey)));

const request = <T,>(run: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  run.onsuccess = () => resolve(run.result);
  run.onerror = () => {
    const error = run.error;
    reject(error instanceof Error ? error : new Error('IndexedDB request failed'));
  };
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

const identityId = (userId: string, sessionId: string) => `${userId}:${sessionId}`;

export const loadOrCreateIdentity = async (userId: string, sessionId: string): Promise<CallIdentity> => {
  const id = identityId(userId, sessionId);
  const stored = await withStore<StoredIdentity | undefined>('readonly', (store) => store.get(id));
  if (stored?.keys?.privateKey && stored.keys.publicKey) {
    return { keys: stored.keys, publicKey: await exportIdentityKey(stored.keys.publicKey) };
  }
  const keys = await generateIdentityKeys();
  await withStore('readwrite', (store) => store.put({ id, user: userId, keys } satisfies StoredIdentity));
  return { keys, publicKey: await exportIdentityKey(keys.publicKey) };
};

export const forgetIdentities = async (keep?: { userId: string; sessionId: string }) => {
  if (typeof indexedDB === 'undefined') return;
  const all = await withStore<StoredIdentity[]>('readonly', (store) => store.getAll());
  const keepId = keep ? identityId(keep.userId, keep.sessionId) : null;
  await Promise.all(all.filter((entry) => entry.id !== keepId).map((entry) => withStore('readwrite', (store) => store.delete(entry.id))));
};
