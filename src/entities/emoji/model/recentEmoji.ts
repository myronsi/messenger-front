import { useSyncExternalStore } from 'react';
import { parseEmojiTokens } from '@/shared/lib/customEmoji';
import {
  LIST_DEBOUNCE_MS, RECENT_EMOJI_KEY, RECENT_EMOJI_MAX, getClientSettings, reloadClientSettingsCache, subscribeClientSettings, updateClientSettings,
} from '@/shared/lib/clientSettings/clientSettingsStore';

const read = () => getClientSettings().recentEmoji;

export const rememberEmoji = (value: string) => {
  const current = read();
  if (current[0] === value) return;
  updateClientSettings({ recentEmoji: [value, ...current.filter((item) => item !== value)].slice(0, RECENT_EMOJI_MAX) }, LIST_DEBOUNCE_MS);
};

export const isRecentEmojiKnown = (item: string, known: ReadonlySet<string>) => {
  const id = parseEmojiTokens(item)[0]?.id;
  return !id || known.has(id);
};

export const forgetUnknownEmoji = (known: ReadonlySet<string>) => {
  const current = read();
  const next = current.filter((item) => isRecentEmojiKnown(item, known));
  if (next.length !== current.length) updateClientSettings({ recentEmoji: next }, LIST_DEBOUNCE_MS);
};

export const resetRecentEmoji = () => reloadClientSettingsCache(RECENT_EMOJI_KEY);

export const useStoredRecentEmoji = () => useSyncExternalStore(subscribeClientSettings, read, read);
