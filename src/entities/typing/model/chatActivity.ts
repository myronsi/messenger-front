import { useSyncExternalStore } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import type { TypingAction } from './typingStore';

export type ChatActivity = Exclude<TypingAction, 'typing' | 'recording_voice'>;

const PRIORITY: ChatActivity[] = ['uploading_video', 'uploading_photo', 'uploading_file', 'choosing_sticker'];
const counts = new Map<string, Map<ChatActivity, number>>();
const listeners = new Set<() => void>();
let snapshot: Record<string, ChatActivity> = {};

const refresh = (key: string) => {
  const active = counts.get(key);
  const current = PRIORITY.find(action => (active?.get(action) ?? 0) > 0);
  if (snapshot[key] === current) return;
  const next = { ...snapshot };
  if (current) next[key] = current;
  else delete next[key];
  snapshot = next;
  listeners.forEach(listener => listener());
};

const change = (key: string, action: ChatActivity, delta: number) => {
  const active = counts.get(key) ?? new Map<ChatActivity, number>();
  const count = Math.max(0, (active.get(action) ?? 0) + delta);
  if (count) active.set(action, count);
  else active.delete(action);
  if (active.size) counts.set(key, active);
  else counts.delete(key);
  refresh(key);
};

export const beginChatActivity = (chatId: EntityId, action: ChatActivity) => {
  const key = String(chatId);
  let ended = false;
  change(key, action, 1);
  return () => {
    if (ended) return;
    ended = true;
    change(key, action, -1);
  };
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const useChatActivity = (chatId: EntityId): ChatActivity | null => {
  const key = String(chatId);
  return useSyncExternalStore(subscribe, () => snapshot[key] ?? null);
};

export const uploadActivity = (fileTypes: string[]): ChatActivity => {
  if (fileTypes.includes('video')) return 'uploading_video';
  if (fileTypes.length > 0 && fileTypes.every(type => type === 'image')) return 'uploading_photo';
  return 'uploading_file';
};
