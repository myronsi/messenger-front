import { describe, expect, it } from 'vitest';
import { buildEmojiIndex, emojiMatches, loadEmojiIndex, normalizeSearch, searchEmoji } from './emojiSearch';

const ru = [
  { unicode: '😂', label: 'смеется до слез', group: 0, tags: ['лол', 'ржака'] },
  { unicode: '❤️', label: 'красное сердце', group: 12, tags: ['любовь'] },
  { unicode: '🏻', label: 'светлый тон кожи', group: 2 },
];
const en = [
  { unicode: '😂', label: 'face with tears of joy', group: 0, tags: ['laugh', 'lol'] },
  { unicode: '❤️', label: 'red heart', group: 12, tags: ['heart', 'love'] },
  { unicode: '🐱', label: 'cat face', group: 3, tags: ['cat', 'pet'] },
  { unicode: '🇦', label: 'regional indicator A' },
];

describe('emoji search', () => {
  const index = buildEmojiIndex(ru, en);

  it('finds emoji by the start of a word in the app language and in English', () => {
    expect(searchEmoji(index, 'серд')).toEqual(['❤️']);
    expect(searchEmoji(index, 'heart')).toEqual(['❤️']);
    expect(searchEmoji(index, 'LOL')).toEqual(['😂']);
  });

  it('needs every word of the query to match', () => {
    expect(searchEmoji(index, 'red heart')).toEqual(['❤️']);
    expect(searchEmoji(index, 'red cat')).toEqual([]);
  });

  it('skips skin tone components and letters without a group', () => {
    expect(index.order).toEqual(['😂', '❤️', '🐱']);
  });

  it('matches an emoji typed into the search and ignores the emoji variation selector', () => {
    expect(emojiMatches(index, '❤', '❤️')).toBe(true);
    expect(emojiMatches(index, '❤', 'love')).toBe(true);
    expect(emojiMatches(index, '🐱', '')).toBe(false);
  });

  it('ignores case and accents', () => {
    expect(normalizeSearch('  Corazón ')).toBe('corazon');
  });

  it('loads the real German data together with English', async () => {
    const german = await loadEmojiIndex('de');
    expect(searchEmoji(german, 'katze')).toContain('🐱');
    expect(searchEmoji(german, 'cat')).toContain('🐱');
  });
});
