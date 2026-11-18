import { afterEach, describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { rememberEmoji, resetRecentEmoji, useStoredRecentEmoji as useRecentEmoji } from './recentEmoji';
import { knownEmojiMap } from './useKnownEmoji';
import type { EmojiPack } from './types';

afterEach(() => {
  localStorage.clear();
  resetRecentEmoji();
});

describe('recent emoji', () => {
  it('keeps the newest first without duplicates and survives a reload', () => {
    const { result } = renderHook(() => useRecentEmoji());
    act(() => {
      rememberEmoji('😀');
      rememberEmoji('<:party:4>');
      rememberEmoji('😀');
    });
    expect(result.current).toEqual(['😀', '<:party:4>']);
    resetRecentEmoji();
    expect(renderHook(() => useRecentEmoji()).result.current).toEqual(['😀', '<:party:4>']);
  });
});

describe('known emoji', () => {
  const pack = (id: string, shortcodes: string[], hidden = false, mine = false): EmojiPack => ({
    id, title: id, version: 0, is_mine: mine, is_installed: true, is_hidden: hidden, can_edit: mine,
    emoji: shortcodes.map((shortcode, index) => ({ id: `${id}-${index}`, pack_id: id, shortcode, is_animated: false, url: '' })),
  });

  it('maps shortcodes to the first pack that has them and skips hidden packs of others', () => {
    const map = knownEmojiMap([pack('a', ['party']), pack('b', ['party', 'cat']), pack('c', ['dog'], true), pack('d', ['owl'], true, true)]);
    expect(map.get('party')?.id).toBe('a-0');
    expect(map.get('cat')?.id).toBe('b-1');
    expect(map.has('dog')).toBe(false);
    expect(map.has('owl')).toBe(true);
  });
});
