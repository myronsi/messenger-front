import { useSyncExternalStore } from 'react';
import type { ServerEvent } from '@myronsi/messenger-api';
import type { EntityId } from '@/shared/api/entityId';

export type TypingAction = 'typing' | 'recording_voice';
export interface TypingUser {
  userId: string;
  action: TypingAction;
}

export const TYPING_EXPIRY_MS = 6000;
const EMPTY: TypingUser[] = [];
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const listeners = new Set<() => void>();
let snapshot: Record<string, TypingUser[]> = {};

const timerKey = (chatId: string, userId: string) => `${chatId}:${userId}`;
const emit = () => listeners.forEach(listener => listener());

const remove = (chatId: string, userId: string) => {
  const key = timerKey(chatId, userId);
  clearTimeout(timers.get(key));
  timers.delete(key);
  const users = snapshot[chatId];
  if (!users?.some(user => user.userId === userId)) return;
  const rest = users.filter(user => user.userId !== userId);
  const next = { ...snapshot };
  if (rest.length) next[chatId] = rest;
  else delete next[chatId];
  snapshot = next;
  emit();
};

const put = (chatId: string, userId: string, action: string) => {
  const key = timerKey(chatId, userId);
  clearTimeout(timers.get(key));
  timers.set(key, setTimeout(() => remove(chatId, userId), TYPING_EXPIRY_MS));
  const entry: TypingUser = { userId, action: action === 'recording_voice' ? 'recording_voice' : 'typing' };
  const users = snapshot[chatId] ?? EMPTY;
  const current = users.find(user => user.userId === userId);
  if (current?.action === entry.action) return;
  snapshot = { ...snapshot, [chatId]: current ? users.map(user => (user.userId === userId ? entry : user)) : [...users, entry] };
  emit();
};

export const clearTypingUsers = () => {
  timers.forEach(timer => clearTimeout(timer));
  timers.clear();
  if (!Object.keys(snapshot).length) return;
  snapshot = {};
  emit();
};

export const applyTypingFrame = (frame: ServerEvent) => {
  if (!frame.chat_id) return;
  if (frame.type === 'typing') {
    if (frame.data.is_typing) put(frame.chat_id, frame.data.user_id, frame.data.action);
    else remove(frame.chat_id, frame.data.user_id);
  } else if (frame.type === 'message' && frame.data.message.sender) {
    remove(frame.chat_id, frame.data.message.sender.id);
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const useTypingUsers = (chatId: EntityId) => {
  const key = String(chatId);
  return useSyncExternalStore(subscribe, () => snapshot[key] ?? EMPTY);
};
