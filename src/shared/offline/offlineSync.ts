import { apiClient } from '@/shared/api/client';
import type { components } from '@/shared/api/generated/schema';
import { messageModel } from '@/shared/api/goModels';
import { contractData } from '@/shared/api/tasks';
import type { OfflineDb } from './offlineDb';
import { getOfflineDb, setOfflineCursorInit } from './offlineSession';

type SyncChange = components['schemas']['SyncChange'];

export type OfflineChange =
  | { type: 'updated'; chatId: string; message: ReturnType<typeof messageModel> }
  | { type: 'deleted'; chatId: string; messageId: string }
  | { type: 'cleared'; chatId: string; beforeId: string }
  | { type: 'pins'; chatId: string }
  | { type: 'imported'; chatId: string }
  | { type: 'reset' };

const SETTLE_MS = 2500;
const MAX_PAGES = 20;
const listeners = new Set<(changes: OfflineChange[]) => void>();
let running: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

const headCursor = async (db: OfflineDb) => {
  const page = contractData(await apiClient.GET('/sync/changes', {}));
  await db.setCursor(page.next_cursor);
};

setOfflineCursorInit(headCursor);

const toChange = (change: SyncChange): OfflineChange | null => {
  const chatId = change.chat_id;
  switch (change.type) {
    case 'message_updated':
      return change.message ? { type: 'updated', chatId, message: messageModel(change.message) } : null;
    case 'message_deleted':
      return change.message_id ? { type: 'deleted', chatId, messageId: change.message_id } : null;
    case 'history_cleared':
    case 'chat_hidden':
      return change.before_message_id ? { type: 'cleared', chatId, beforeId: change.before_message_id } : null;
    case 'pins_changed':
      return { type: 'pins', chatId };
    case 'history_imported':
      return { type: 'imported', chatId };
    default:
      return null;
  }
};

const apply = async (db: OfflineDb, change: OfflineChange) => {
  if (change.type === 'updated') await db.updateMessage(change.chatId, change.message);
  else if (change.type === 'deleted') await db.removeMessages(change.chatId, [change.messageId]);
  else if (change.type === 'cleared') await db.clearUpTo(change.chatId, change.beforeId);
};

const run = async () => {
  const db = await getOfflineDb();
  if (!db) return;
  const cursor = await db.getCursor();
  if (!cursor) return headCursor(db);
  const changes: OfflineChange[] = [];
  let next = cursor;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = contractData(await apiClient.GET('/sync/changes', { params: { query: { cursor: next } } }));
    if (result.reset_required) {
      await db.clearData();
      await db.setCursor(result.next_cursor);
      changes.push({ type: 'reset' });
      break;
    }
    for (const change of result.changes.map(toChange)) {
      if (!change) continue;
      await apply(db, change);
      changes.push(change);
    }
    next = result.next_cursor;
    await db.setCursor(next);
    if (!result.has_more) break;
  }
  if (changes.length) listeners.forEach((listener) => listener(changes));
};

export const syncOfflineChanges = () => {
  running ??= run().catch(() => undefined).finally(() => { running = null; });
  return running;
};

export const scheduleOfflineSync = (delay = SETTLE_MS) => {
  clearTimeout(timer);
  timer = setTimeout(() => { void syncOfflineChanges(); }, delay);
};

export const onOfflineChanges = (listener: (changes: OfflineChange[]) => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
