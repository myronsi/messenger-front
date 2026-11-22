import { useEffect, useRef } from 'react';
import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import { historySnapshot, saveChatSnapshot } from '@/shared/api/chatSnapshots';
import type { Message, MessageHistoryResponse } from '@/entities/message';

export const SNAPSHOT_SYNC_DELAY_MS = 1000;

interface HistorySnapshotSyncOptions {
  chatId: EntityId;
  messages: Message[];
  enabled: boolean;
  hasMoreBefore: boolean;
}

const LOCAL_FIELDS = ['is_cached', 'local_object_url', 'client_temp_id', 'server_kept'] as const;

export const snapshotPage = (messages: Message[], hasMoreBefore: boolean): MessageHistoryResponse | null => {
  const history = messages
    .filter((message) => isPersistedId(message.id) && !message.is_cached)
    .map((message) => {
      const stored: Record<string, unknown> = { ...message };
      LOCAL_FIELDS.forEach((field) => { delete stored[field]; });
      return stored as unknown as Message;
    });
  if (!history.length) return null;
  return {
    history, has_more: hasMoreBefore, has_more_before: hasMoreBefore, has_more_after: false,
    next_before_id: history[0].id, next_after_id: null,
  };
};

export const useHistorySnapshotSync = ({ chatId, messages, enabled, hasMoreBefore }: HistorySnapshotSyncOptions) => {
  const pending = useRef<{ key: string; page: MessageHistoryResponse } | null>(null);

  useEffect(() => {
    if (!enabled || !isPersistedId(chatId)) return undefined;
    const page = snapshotPage(messages, hasMoreBefore);
    if (!page) return undefined;
    pending.current = { key: historySnapshot(chatId), page };
    const timer = window.setTimeout(() => {
      const next = pending.current;
      pending.current = null;
      if (next) void saveChatSnapshot(next.key, next.page);
    }, SNAPSHOT_SYNC_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [chatId, messages, enabled, hasMoreBefore]);

  useEffect(() => () => {
    const next = pending.current;
    pending.current = null;
    if (next) void saveChatSnapshot(next.key, next.page);
  }, [chatId]);
};
