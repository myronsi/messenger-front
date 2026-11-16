import { useMemo } from 'react';
import type { KnownEmoji } from '@/shared/lib/customEmoji';
import { useAccessToken } from '@/shared/auth/session';
import { useListEmojiPacksQuery } from '../api/emojiApi';
import type { CustomEmoji, EmojiPack } from './types';

export const knownEmojiMap = (packs: EmojiPack[]) => {
  const map = new Map<string, KnownEmoji>();
  for (const pack of packs) {
    if (pack.is_hidden && !pack.is_mine) continue;
    for (const emoji of pack.emoji) {
      if (!map.has(emoji.shortcode)) map.set(emoji.shortcode, emoji);
    }
  }
  return map;
};

export const useEmojiPacks = () => {
  const signedIn = !!useAccessToken();
  return useListEmojiPacksQuery(undefined, { skip: !signedIn }).data ?? [];
};

export const useKnownEmoji = () => {
  const packs = useEmojiPacks();
  return useMemo(() => knownEmojiMap(packs), [packs]);
};

export const useEmojiById = () => {
  const packs = useEmojiPacks();
  return useMemo(() => {
    const map = new Map<string, CustomEmoji>();
    packs.forEach((pack) => pack.emoji.forEach((emoji) => map.set(emoji.id, emoji)));
    return map;
  }, [packs]);
};
