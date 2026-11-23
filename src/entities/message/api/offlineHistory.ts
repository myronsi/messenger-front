import { useEffect, useRef, useState } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import { enforceStorageCapSoon, getOfflineDb, withOfflineDb } from '@/shared/offline';
import type { MessageHistoryResponse } from '../model/history';
import type { ChatSearchResponse, Message } from '../model/types';

export interface HistoryArgs {
  chatId: EntityId;
  limit?: number;
  beforeId?: EntityId | null;
  afterId?: EntityId | null;
  aroundId?: EntityId | null;
}

const page = (history: Message[], hasBefore: boolean, hasAfter: boolean): MessageHistoryResponse => ({
  history,
  has_more: hasBefore,
  has_more_before: hasBefore,
  has_more_after: hasAfter,
  next_before_id: hasBefore ? history[0]?.id ?? null : null,
  next_after_id: hasAfter ? history[history.length - 1]?.id ?? null : null,
});

const UNREACHABLE = new Set<unknown>(['FETCH_ERROR', 'TIMEOUT_ERROR', 502, 503, 504]);

export const isUnreachable = (error: unknown) => UNREACHABLE.has((error as { status?: unknown } | undefined)?.status);

export const localHistoryPage = async ({ chatId, limit = 50, beforeId, afterId, aroundId }: HistoryArgs) => {
  const db = await getOfflineDb();
  if (!db) return null;
  if (beforeId) {
    const history = await db.readOlder<Message>(chatId, beforeId, limit);
    return page(history, history.length === limit, true);
  }
  if (afterId) {
    const history = await db.readNewer<Message>(chatId, afterId, limit);
    return page(history, true, history.length === limit);
  }
  if (aroundId) {
    const half = Math.floor(limit / 2);
    const older = await db.readOlder<Message>(chatId, aroundId, half);
    const newer = await db.readNewer<Message>(chatId, older[older.length - 1]?.id ?? '0', limit - older.length);
    if (!newer.some((message) => String(message.id) === String(aroundId))) return null;
    return page([...older, ...newer], older.length === half, newer.length === limit - older.length);
  }
  const history = await db.readLatest<Message>(chatId, limit);
  return history.length ? page(history, history.length === limit, false) : null;
};

const persisted = (message: Message) => !message.upload_status && !message.local_object_url && !message.is_cached;

export const storeHistory = (chatId: EntityId, history: Message[]) => {
  const messages = history.filter(persisted);
  if (!messages.length) return;
  withOfflineDb((db) => db.storeMessages(chatId, messages));
  enforceStorageCapSoon();
};

export const localSearch = async (chatId: EntityId, query: string): Promise<ChatSearchResponse | null> => {
  const db = await getOfflineDb();
  if (!db) return null;
  return { results: (await db.search<Message>(query, chatId)).map((hit) => hit.message) };
};

export const forgetHistory = (chatId: EntityId) => withOfflineDb((db) => db.dropChat(chatId));

export const useLocalHistoryPage = (args: HistoryArgs | null) => {
  const key = args ? JSON.stringify([String(args.chatId), args.aroundId ? String(args.aroundId) : null]) : null;
  const [loaded, setLoaded] = useState<{ key: string; page: MessageHistoryResponse }>();
  const argsRef = useRef(args);
  argsRef.current = args;
  useEffect(() => {
    const current = argsRef.current;
    if (!current || !key) return undefined;
    let active = true;
    void localHistoryPage(current).then((page) => {
      if (active && page) setLoaded({ key, page });
    }).catch(() => undefined);
    return () => { active = false; };
  }, [key]);
  return loaded?.key === key ? loaded.page : undefined;
};
