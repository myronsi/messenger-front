import type { EntityId } from '@/shared/api/entityId';
import { padId, unpadId, type MessageRecord, type OfflineBackend } from './backend';
import { openBytes, openJson, sealBytes, sealJson, searchToken, type OfflineKeys } from './cipher';
import { indexWords, matchesQuery, queryWords } from './searchWords';

export interface OfflineMessage {
  id: EntityId;
  content?: unknown;
}

export const searchableText = (message: OfflineMessage) => {
  const { content } = message;
  if (typeof content === 'string') return content;
  const caption = (content as { caption?: unknown } | null | undefined)?.caption;
  return typeof caption === 'string' ? caption : '';
};

export interface OfflineSearchHit<T> {
  chatId: string;
  message: T;
}

const CURSOR = 'sync-cursor';

const recordSize = (record: MessageRecord) => record.sealed.data.byteLength + record.tokens.length * 24 + 64;

export const createOfflineDb = (backend: OfflineBackend, keys: OfflineKeys, now = () => Date.now()) => {
  const seal = async (chatId: string, message: OfflineMessage): Promise<MessageRecord> => {
    const sealed = await sealJson(keys, message);
    const tokens = await Promise.all(indexWords(searchableText(message)).map((word) => searchToken(keys, word)));
    const record = { chatId, id: padId(message.id), sealed, size: 0, tokens };
    return { ...record, size: recordSize(record) };
  };
  const open = <T>(records: MessageRecord[]) => Promise.all(records.map((record) => openJson<T>(keys, record.sealed)));

  return {
    async storeMessages(chatId: EntityId, messages: OfflineMessage[]) {
      if (!messages.length) return;
      await backend.putMessages(await Promise.all(messages.map((message) => seal(String(chatId), message))));
      await backend.ensureChat(String(chatId));
    },
    async updateMessage(chatId: EntityId, message: OfflineMessage) {
      if (await backend.getMessage(String(chatId), padId(message.id))) await this.storeMessages(chatId, [message]);
    },
    removeMessages: (chatId: EntityId, ids: EntityId[]) => backend.deleteMessages(String(chatId), ids.map(padId)),
    clearUpTo: (chatId: EntityId, id: EntityId) => backend.deleteUpTo(String(chatId), padId(id)),
    dropChat: (chatId: EntityId) => backend.deleteChat(String(chatId)),
    openedChat: (chatId: EntityId) => backend.touchChat(String(chatId), now()),
    async chatIds() {
      return (await backend.chats()).map((chat) => chat.chatId);
    },
    async readLatest<T>(chatId: EntityId, limit: number) {
      return (await open<T>(await backend.readBefore(String(chatId), null, limit))).reverse();
    },
    async readOlder<T>(chatId: EntityId, beforeId: EntityId, limit: number) {
      return (await open<T>(await backend.readBefore(String(chatId), padId(beforeId), limit))).reverse();
    },
    async readNewer<T>(chatId: EntityId, afterId: EntityId, limit: number) {
      return open<T>(await backend.readAfter(String(chatId), padId(afterId), limit));
    },
    async newestId(chatId: EntityId) {
      const [newest] = await backend.readBefore(String(chatId), null, 1);
      return newest ? unpadId(newest.id) : null;
    },
    async search<T extends OfflineMessage>(query: string, chatId?: EntityId | null, limit = 100): Promise<OfflineSearchHit<T>[]> {
      const tokens = await Promise.all(queryWords(query).map((word) => searchToken(keys, word)));
      if (!tokens.length) return [];
      const lists = await Promise.all(tokens.map((token) => backend.byToken(token)));
      const key = (hit: { chatId: string; id: string }) => `${hit.chatId}|${hit.id}`;
      const rest = lists.slice(1).map((list) => new Set(list.map(key)));
      const candidates = lists[0]
        .filter((hit) => (chatId == null || hit.chatId === String(chatId)) && rest.every((set) => set.has(key(hit))))
        .sort((a, b) => (a.id < b.id ? 1 : -1));
      const hits: OfflineSearchHit<T>[] = [];
      for (const candidate of candidates) {
        if (hits.length >= limit) break;
        const record = await backend.getMessage(candidate.chatId, candidate.id);
        if (!record) continue;
        const message = await openJson<T>(keys, record.sealed);
        if (matchesQuery(searchableText(message), query)) hits.push({ chatId: candidate.chatId, message });
      }
      return hits;
    },
    async saveMedia(url: string, blob: Blob, lifetime = Infinity) {
      const sealed = await sealBytes(keys, await blob.arrayBuffer());
      await backend.putMedia({ url, sealed, type: blob.type, size: sealed.data.byteLength, usedAt: now(), expiresAt: now() + lifetime });
    },
    async loadMedia(url: string) {
      const record = await backend.getMedia(url);
      if (!record) return undefined;
      void backend.touchMedia(url, now()).catch(() => undefined);
      const blob = new Blob([await openBytes(keys, record.sealed)], { type: record.type });
      return { blob, fresh: (record.expiresAt ?? 0) > now() };
    },
    async usage() {
      const { messages, media } = await backend.usage();
      return { messages, media, total: messages + media };
    },
    async enforceCap(capBytes: number | null) {
      if (capBytes === null) return;
      let { total } = await this.usage();
      if (total <= capBytes) return;
      const media = await backend.mediaByAge();
      const dropMedia: string[] = [];
      for (const item of media) {
        if (total <= capBytes) break;
        dropMedia.push(item.url);
        total -= item.size;
      }
      if (dropMedia.length) await backend.deleteMedia(dropMedia);
      const chats = (await backend.chats()).sort((a, b) => a.openedAt - b.openedAt);
      for (const chat of chats) {
        if (total <= capBytes) break;
        await backend.deleteChat(chat.chatId);
        ({ total } = await this.usage());
      }
    },
    getCursor: () => backend.getMeta<string>(CURSOR),
    setCursor: (cursor: string) => backend.setMeta(CURSOR, cursor),
    clearData: () => backend.clearData(),
  };
};

export type OfflineDb = ReturnType<typeof createOfflineDb>;
