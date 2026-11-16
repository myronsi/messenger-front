import { describe, expect, it } from 'vitest';
import { addEmojiError, isShortcode, shortcodeFromFile } from './emojiForm';
import { emojiLinkSlug } from './emojiLink';

const texts = { failed: 'failed', shortcodeTaken: 'taken', limitReached: 'full' };

describe('emoji form helpers', () => {
  it('checks and suggests shortcodes', () => {
    expect(isShortcode('party_cat')).toBe(true);
    expect(isShortcode('P')).toBe(false);
    expect(shortcodeFromFile('Party Cat!.PNG')).toBe('party_cat');
    expect(shortcodeFromFile('x.gif')).toBe('');
  });

  it('explains add errors', () => {
    expect(addEmojiError({ status: 409, data: { code: 'limit_reached' } }, texts)).toBe('full');
    expect(addEmojiError({ status: 409, data: { code: 'conflict' } }, texts)).toBe('taken');
    expect(addEmojiError({ status: 422 }, texts)).toBe('failed');
  });

  it('reads pack links', () => {
    expect(emojiLinkSlug('/emoji/abcdefgh1234')).toBe('abcdefgh1234');
    expect(emojiLinkSlug('/emoji/short')).toBeNull();
    expect(emojiLinkSlug('/stickers/abcdefgh1234')).toBeNull();
  });
});
