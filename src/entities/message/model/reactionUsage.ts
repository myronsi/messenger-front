import { onAccountCleared } from '@/shared/auth/accountStorage';
import { useMemo, useSyncExternalStore } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import {
  LIST_DEBOUNCE_MS, RECENT_REACTIONS_KEY, RECENT_REACTIONS_MAX, getClientSettings, reloadClientSettingsCache, subscribeClientSettings,
  updateClientSettings,
} from '@/shared/lib/clientSettings/clientSettingsStore';

const LEGACY_KEY = 'messenger.reactionUsage';
export const QUICK_REACTION_COUNT = 6;
export const DEFAULT_QUICK_REACTIONS = ['❤️', '👍', '😂', '🥰', '😢', '😠'];
export const DOUBLE_TAP_REACTION = '❤️';

const listeners = new Set<() => void>();
const readRecent = () => getClientSettings().recentReactions;

const isEntry = (value: unknown): value is { count: number; last: number } => !!value && typeof value === 'object'
  && typeof (value as { count?: unknown }).count === 'number' && typeof (value as { last?: unknown }).last === 'number';

export const legacyRecentReactions = (raw: string | null): string[] => {
  try {
    const parsed: unknown = JSON.parse(raw || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
    return Object.entries(parsed)
      .filter((entry): entry is [string, { count: number; last: number }] => isEntry(entry[1]))
      .sort(([, a], [, b]) => b.last - a.last)
      .map(([reaction]) => reaction)
      .slice(0, RECENT_REACTIONS_MAX);
  } catch {
    return [];
  }
};

export const adoptLegacyReactionUsage = (userId: EntityId) => {
  const key = `${LEGACY_KEY}.${String(userId)}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return;
    localStorage.removeItem(key);
    const legacy = legacyRecentReactions(raw);
    if (!legacy.length || readRecent().length) return;
    localStorage.setItem(RECENT_REACTIONS_KEY, JSON.stringify(legacy));
    reloadClientSettingsCache(RECENT_REACTIONS_KEY);
  } catch {
    return;
  }
};

export const recordReaction = (_userId: EntityId, reaction: string) => {
  const current = readRecent();
  if (current[0] === reaction) return;
  updateClientSettings({ recentReactions: [reaction, ...current.filter((item) => item !== reaction)].slice(0, RECENT_REACTIONS_MAX) }, LIST_DEBOUNCE_MS);
};

export const resetReactionUsage = () => reloadClientSettingsCache(RECENT_REACTIONS_KEY);

export const quickReactions = (recent: readonly string[], count = QUICK_REACTION_COUNT) => (
  [...new Set([...recent, ...DEFAULT_QUICK_REACTIONS])].slice(0, count)
);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const useQuickReactions = (_userId?: EntityId | null) => {
  const recent = useSyncExternalStore(subscribeClientSettings, readRecent, readRecent);
  return useMemo(() => quickReactions(recent), [recent]);
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
  resetDoubleTapReaction();
});
