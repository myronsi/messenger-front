import { onAccountCleared } from '@/shared/auth/accountStorage';
import { useMemo, useSyncExternalStore } from 'react';
import type { EntityId } from '@/shared/api/entityId';

const KEY = 'messenger.reactionUsage';
const KEEP = 30;
export const QUICK_REACTION_COUNT = 6;
export const DEFAULT_QUICK_REACTIONS = ['❤️', '👍', '😂', '🥰', '😢', '😠'];
export const DOUBLE_TAP_REACTION = '❤️';

export type ReactionUsage = Record<string, { count: number; last: number }>;

const EMPTY: ReactionUsage = {};
const cache = new Map<string, ReactionUsage>();
const listeners = new Set<() => void>();
const storageKey = (userId: EntityId) => `${KEY}.${String(userId)}`;

const isEntry = (value: unknown): value is { count: number; last: number } => !!value && typeof value === 'object'
  && typeof (value as { count?: unknown }).count === 'number' && typeof (value as { last?: unknown }).last === 'number';

export const readReactionUsage = (userId: EntityId): ReactionUsage => {
  const key = storageKey(userId);
  const cached = cache.get(key);
  if (cached) return cached;
  let usage: ReactionUsage = EMPTY;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      usage = Object.fromEntries(Object.entries(parsed).filter(([, value]) => isEntry(value))) as ReactionUsage;
    }
  } catch {
    usage = EMPTY;
  }
  cache.set(key, usage);
  return usage;
};

const ranked = (usage: ReactionUsage) => Object.entries(usage)
  .sort(([, a], [, b]) => b.count - a.count || b.last - a.last)
  .map(([reaction]) => reaction);

export const recordReaction = (userId: EntityId, reaction: string, now = Date.now()) => {
  const current = readReactionUsage(userId);
  const entry = current[reaction];
  const next = { ...current, [reaction]: { count: (entry?.count ?? 0) + 1, last: now } };
  const kept: ReactionUsage = Object.fromEntries(ranked(next).slice(0, KEEP).map((key) => [key, next[key]]));
  cache.set(storageKey(userId), kept);
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(kept));
  } catch {
    cache.set(storageKey(userId), { ...kept });
  }
  listeners.forEach((listener) => listener());
};

export const resetReactionUsage = () => cache.clear();

export const quickReactions = (usage: ReactionUsage, count = QUICK_REACTION_COUNT) => (
  [...new Set([...ranked(usage), ...DEFAULT_QUICK_REACTIONS])].slice(0, count)
);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const useQuickReactions = (userId: EntityId) => {
  const usage = useSyncExternalStore(subscribe, () => readReactionUsage(userId), () => readReactionUsage(userId));
  return useMemo(() => quickReactions(usage), [usage]);
};

const DOUBLE_TAP_KEY = 'messenger.doubleTapReaction';
const doubleTapCache = new Map<string, string>();
const doubleTapKey = (userId?: EntityId | null) => `${DOUBLE_TAP_KEY}.${String(userId ?? '')}`;

export const readDoubleTapReaction = (userId?: EntityId | null): string => {
  const key = doubleTapKey(userId);
  const cached = doubleTapCache.get(key);
  if (cached !== undefined) return cached;
  let value = DOUBLE_TAP_REACTION;
  try {
    const stored = localStorage.getItem(key);
    if (stored !== null) value = stored;
  } catch {
    value = DOUBLE_TAP_REACTION;
  }
  doubleTapCache.set(key, value);
  return value;
};

export const setDoubleTapReaction = (userId: EntityId, reaction: string) => {
  doubleTapCache.set(doubleTapKey(userId), reaction);
  try {
    localStorage.setItem(doubleTapKey(userId), reaction);
  } catch {
    doubleTapCache.set(doubleTapKey(userId), reaction);
  }
  listeners.forEach((listener) => listener());
};

export const resetDoubleTapReaction = () => doubleTapCache.clear();

export const useDoubleTapReaction = (userId?: EntityId | null) => useSyncExternalStore(
  subscribe, () => readDoubleTapReaction(userId), () => readDoubleTapReaction(userId),
);

onAccountCleared(() => {
  resetReactionUsage();
  resetDoubleTapReaction();
});
