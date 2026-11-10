import { expect, it } from 'vitest';
import { EMOJI_SETS } from './emojiSets';

it('lists each emoji once and only single emoji', () => {
  const all = EMOJI_SETS.flatMap((set) => set.emoji);
  expect(new Set(all).size).toBe(all.length);
  expect(all.every((emoji) => emoji.length > 0 && !/\s/.test(emoji))).toBe(true);
});
