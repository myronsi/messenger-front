import { describe, expect, it } from 'vitest';
import type { CustomEmoji } from '@/entities/emoji';
import { applySuggestion, matchesShortcode, MAX_SUGGESTIONS, shortcodeQuery, suggestEmoji } from './emojiAutocomplete';

const emoji = (shortcode: string, id = shortcode): CustomEmoji => ({ id, pack_id: '1', shortcode, is_animated: false, url: '' });

describe('emoji autocomplete', () => {
  it('finds a shortcode being typed before the caret', () => {
    expect(shortcodeQuery('hello :par', 10)).toEqual({ query: 'par', start: 6 });
    expect(shortcodeQuery(':pa', 3)).toEqual({ query: 'pa', start: 0 });
    expect(shortcodeQuery('time 10:30', 10)).toBeNull();
    expect(shortcodeQuery('hello :p', 8)).toBeNull();
    expect(shortcodeQuery('hello :party: x', 15)).toBeNull();
  });

  it('suggests prefix matches first, without duplicate shortcodes', () => {
    const all = [emoji('happy_party'), emoji('party'), emoji('party', 'other'), emoji('parrot'), emoji('cat')];
    expect(suggestEmoji(all, 'par').map((item) => item.id)).toEqual(['party', 'parrot', 'happy_party']);
    expect(suggestEmoji(Array.from({ length: 10 }, (_, index) => emoji(`par${index}`)), 'par')).toHaveLength(MAX_SUGGESTIONS);
  });

  it('replaces the typed part with the full shortcode', () => {
    expect(applySuggestion('hi :par there', 7, { query: 'par', start: 3 }, 'party')).toEqual({ value: 'hi :party:  there', caret: 11 });
  });

  it('matches shortcodes typed with colons', () => {
    expect(matchesShortcode(emoji('party_cat'), ':cat:')).toBe(true);
    expect(matchesShortcode(emoji('party_cat'), 'dog')).toBe(false);
  });
});
