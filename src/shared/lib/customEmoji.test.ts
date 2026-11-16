import { describe, expect, it } from 'vitest';
import {
  customReaction, customReactionId, emojiToken, encodeShortcodes, hasEmojiTokens, isEmojiOnly, parseEmojiTokens, plainEmoji, splitEmoji,
  type KnownEmoji,
} from './customEmoji';

describe('custom emoji tokens', () => {
  it('parses static and animated tokens and skips invalid ones', () => {
    const tokens = parseEmojiTokens('hi <:party_cat:42> <a:wave:7> <:Bad:1> <:x:2> <:ok:0>');
    expect(tokens.map(({ shortcode, id, animated }) => [shortcode, id, animated])).toEqual([['party_cat', '42', false], ['wave', '7', true]]);
  });

  it('splits text around tokens', () => {
    expect(splitEmoji('a<:b_c:1>d')).toEqual([
      { kind: 'text', text: 'a' },
      { kind: 'emoji', token: { start: 1, end: 9, animated: false, shortcode: 'b_c', id: '1' } },
      { kind: 'text', text: 'd' },
    ]);
    expect(splitEmoji('plain')).toEqual([{ kind: 'text', text: 'plain' }]);
  });

  it('turns tokens into their shortcode text', () => {
    expect(plainEmoji('yay <:party:9>!<a:wave:3>')).toBe('yay :party:!:wave:');
    expect(hasEmojiTokens('none')).toBe(false);
    expect(hasEmojiTokens('<:ok_ok:5>')).toBe(true);
  });

  it('encodes known shortcodes and leaves unknown ones and existing tokens alone', () => {
    const known = new Map<string, KnownEmoji>([['party', { id: '9', shortcode: 'party', is_animated: false }], ['wave', { id: '3', shortcode: 'wave', is_animated: true }]]);
    expect(encodeShortcodes(':party: and :wave: but :nope: <:party:9>', known)).toBe('<:party:9> and <a:wave:3> but :nope: <:party:9>');
    expect(encodeShortcodes(':party:', new Map())).toBe(':party:');
    expect(emojiToken({ id: '3', shortcode: 'wave', is_animated: true })).toBe('<a:wave:3>');
  });

  it('tells emoji-only messages apart', () => {
    expect(isEmojiOnly(' <:a1:1> <:b2:2> ')).toBe(true);
    expect(isEmojiOnly('<:a1:1><:b2:2><:c3:3><:d4:4>')).toBe(false);
    expect(isEmojiOnly('hi <:a1:1>')).toBe(false);
    expect(isEmojiOnly('')).toBe(false);
  });

  it('reads custom reactions', () => {
    expect(customReactionId('c:12')).toBe('12');
    expect(customReactionId('c:0')).toBeNull();
    expect(customReactionId('👍')).toBeNull();
    expect(customReaction('5')).toBe('c:5');
  });
});
