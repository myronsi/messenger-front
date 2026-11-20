import { describe, expect, it } from 'vitest';
import { isMentionOf, mentionedNames, splitMentions } from './mentions';

describe('splitMentions', () => {
  it('finds names at the start, after spaces and after punctuation', () => {
    expect(splitMentions('@anna hi (@Bob_1), @all!')).toEqual([
      { text: '@anna', mention: 'anna' },
      { text: ' hi (' },
      { text: '@Bob_1', mention: 'Bob_1' },
      { text: '), ' },
      { text: '@all', mention: 'all' },
      { text: '!' },
    ]);
  });

  it.each([
    ['email@host.com'],
    ['@ab'],
    [`@${'a'.repeat(33)}`],
    ['@a-b'],
    ['no mention'],
  ])('leaves %s as text', (text) => {
    expect(splitMentions(text).some((part) => part.mention)).toBe(false);
  });

  it('does not read @@name as a mention, like the server', () => {
    expect(splitMentions('@@anna')).toEqual([{ text: '@@anna' }]);
  });

  it('accepts exactly 32 characters and stops at a dash', () => {
    expect(splitMentions(`@${'a'.repeat(32)}`)[0].mention).toBe('a'.repeat(32));
    expect(splitMentions('@anna-k')).toEqual([{ text: '@anna', mention: 'anna' }, { text: '-k' }]);
  });

  it('keeps the text unchanged when joined', () => {
    const text = 'hey @anna, see @bob\nand @carl.';
    expect(splitMentions(text).map((part) => part.text).join('')).toBe(text);
  });
});

it('lists distinct names ignoring case', () => {
  expect(mentionedNames('@Anna @anna @bob')).toEqual(['anna', 'bob']);
});

it('matches the own username ignoring case', () => {
  expect(isMentionOf('ANNA', 'anna')).toBe(true);
  expect(isMentionOf('anna', '')).toBe(false);
});
