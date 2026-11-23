import type { ChatRecord, MediaRecord, MessageRecord, OfflineBackend } from './backend';

const VERSION = 1;
const MIN_ID = '';
const MAX_ID = '￿';
const STORES = ['messages', 'chats', 'media'];

const done = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const committed = (tx: IDBTransaction) => new Promise<void>((resolve, reject) => {
  tx.oncomplete = () => resolve();
  tx.onerror = tx.onabort = () => reject(tx.error);
});

const upgrade = (db: IDBDatabase) => {
  db.createObjectStore('messages', { keyPath: ['chatId', 'id'] }).createIndex('tokens', 'tokens', { multiEntry: true });
  db.createObjectStore('chats', { keyPath: 'chatId' });
  db.createObjectStore('media', { keyPath: 'url' }).createIndex('usedAt', 'usedAt');
  db.createObjectStore('meta');
};

export const deleteIdbDatabase = (name: string) => new Promise<void>((resolve) => {
  const request = indexedDB.deleteDatabase(name);
  request.onsuccess = request.onerror = request.onblocked = () => resolve();
});

const chatRange = (chatId: string, from = MIN_ID, to = MAX_ID, openFrom = false, openTo = false) =>
  IDBKeyRange.bound([chatId, from], [chatId, to], openFrom, openTo);

const readCursor = <T>(source: IDBObjectStore | IDBIndex, range: IDBKeyRange | null, direction: IDBCursorDirection, limit: number) =>
  new Promise<T[]>((resolve, reject) => {
    const out: T[] = [];
    const request = source.openCursor(range, direction);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor || out.length >= limit) return resolve(out);
      out.push(cursor.value as T);
      cursor.continue();
    };
  });

const sumSizes = (store: IDBObjectStore) => readCursor<{ size?: number }>(store, null, 'next', Infinity)
  .then((rows) => rows.reduce((total, row) => total + (row.size ?? 0), 0));

const idbBackend = (db: IDBDatabase): OfflineBackend => {
  const write = async (stores: string[], fn: (tx: IDBTransaction) => void) => {
    const tx = db.transaction(stores, 'readwrite');
    fn(tx);
    await committed(tx);
  };
  const read = (store: string) => db.transaction(store).objectStore(store);
  return {
    putMessages: (records) => write(['messages'], (tx) => records.forEach((record) => tx.objectStore('messages').put(record))),
    deleteMessages: (chatId, ids) => write(['messages'], (tx) => ids.forEach((id) => tx.objectStore('messages').delete([chatId, id]))),
    deleteUpTo: (chatId, id) => write(['messages'], (tx) => tx.objectStore('messages').delete(chatRange(chatId, MIN_ID, id))),
    deleteChat: (chatId) => write(['messages', 'chats'], (tx) => {
      tx.objectStore('messages').delete(chatRange(chatId));
      tx.objectStore('chats').delete(chatId);
    }),
    readBefore: (chatId, before, limit) =>
      readCursor<MessageRecord>(read('messages'), chatRange(chatId, MIN_ID, before ?? MAX_ID, false, before !== null), 'prev', limit),
    readAfter: (chatId, after, limit) => readCursor<MessageRecord>(read('messages'), chatRange(chatId, after, MAX_ID, true), 'next', limit),
    getMessage: (chatId, id) => done(read('messages').get([chatId, id])) as Promise<MessageRecord | undefined>,
    byToken: async (token) => {
      const keys = await done(read('messages').index('tokens').getAllKeys(token));
      return (keys as unknown as [string, string][]).map(([chatId, id]) => ({ chatId, id }));
    },
    chats: () => done(read('chats').getAll()) as Promise<ChatRecord[]>,
    touchChat: (chatId, openedAt) => write(['chats'], (tx) => tx.objectStore('chats').put({ chatId, openedAt })),
    ensureChat: (chatId) => write(['chats'], (tx) => {
      const store = tx.objectStore('chats');
      const request = store.get(chatId);
      request.onsuccess = () => {
        if (!request.result) store.put({ chatId, openedAt: 0 });
      };
    }),
    putMedia: (record) => write(['media'], (tx) => tx.objectStore('media').put(record)),
    getMedia: (url) => done(read('media').get(url)) as Promise<MediaRecord | undefined>,
    touchMedia: (url, usedAt) => write(['media'], (tx) => {
      const store = tx.objectStore('media');
      const request = store.get(url);
      request.onsuccess = () => {
        if (request.result) store.put({ ...(request.result as MediaRecord), usedAt });
      };
    }),
    deleteMedia: (urls) => write(['media'], (tx) => urls.forEach((url) => tx.objectStore('media').delete(url))),
    mediaByAge: async () => (await readCursor<MediaRecord>(read('media').index('usedAt'), null, 'next', Infinity))
      .map(({ url, size }) => ({ url, size })),
    usage: async () => {
      const tx = db.transaction(['messages', 'media']);
      const [messages, media] = await Promise.all([sumSizes(tx.objectStore('messages')), sumSizes(tx.objectStore('media'))]);
      return { messages, media };
    },
    getMeta: <T,>(key: string) => done(read('meta').get(key)) as Promise<T | undefined>,
    setMeta: (key, value) => write(['meta'], (tx) => tx.objectStore('meta').put(value, key)),
    clearData: () => write(STORES, (tx) => STORES.forEach((store) => tx.objectStore(store).clear())),
    close: () => db.close(),
  };
};

export const openIdbBackend = (name: string) => new Promise<OfflineBackend>((resolve, reject) => {
  if (typeof indexedDB === 'undefined') return reject(new Error('no IndexedDB'));
  const request = indexedDB.open(name, VERSION);
  request.onupgradeneeded = () => upgrade(request.result);
  request.onerror = request.onblocked = () => reject(request.error ?? new Error('offline database blocked'));
  request.onsuccess = () => resolve(idbBackend(request.result));
});
