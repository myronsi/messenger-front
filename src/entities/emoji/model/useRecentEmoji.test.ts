import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EmojiPack } from './types';

const query = vi.hoisted(() => ({ result: {} as { data?: EmojiPack[]; isSuccess: boolean; isFetching: boolean } }));
vi.mock('../api/emojiApi', () => ({ useListEmojiPacksQuery: () => query.result }));
vi.mock('@/shared/auth/session', () => ({ useAccessToken: () => 'token' }));

const { rememberEmoji, resetRecentEmoji } = await import('./recentEmoji');
const { useRecentEmoji } = await import('./useKnownEmoji');

const pack = (...ids: string[]): EmojiPack => ({
  id: 'p', title: 'p', version: 0, is_mine: true, is_installed: true, is_hidden: false, can_edit: true,
  emoji: ids.map((id) => ({ id, pack_id: 'p', shortcode: `s${id}`, is_animated: false, url: '' })),
});
const stored = () => JSON.parse(localStorage.getItem('messenger.recentEmoji') || '[]') as string[];

beforeEach(() => {
  act(() => {
    rememberEmoji('<:gone:2>');
    rememberEmoji('😀');
    rememberEmoji('<a:party:1>');
  });
});

afterEach(() => {
  localStorage.clear();
  resetRecentEmoji();
});

describe('useRecentEmoji', () => {
  it('drops custom emoji that are no longer in any pack once the packs are freshly loaded', () => {
    query.result = { data: [pack('1')], isSuccess: true, isFetching: false };
    const { result } = renderHook(() => useRecentEmoji());
    expect(result.current).toEqual(['<a:party:1>', '😀']);
    expect(stored()).toEqual(['<a:party:1>', '😀']);
  });

  it('hides deleted emoji but keeps them stored while the packs are still loading or failed', () => {
    query.result = { data: [pack('1')], isSuccess: true, isFetching: true };
    const { result, rerender } = renderHook(() => useRecentEmoji());
    expect(result.current).toEqual(['<a:party:1>', '😀']);
    expect(stored()).toHaveLength(3);
    query.result = { data: [pack('1')], isSuccess: false, isFetching: false };
    rerender();
    expect(stored()).toHaveLength(3);
  });

  it('shows everything and prunes nothing before the packs arrive', () => {
    query.result = { data: undefined, isSuccess: false, isFetching: true };
    const { result } = renderHook(() => useRecentEmoji());
    expect(result.current).toEqual(['<a:party:1>', '😀', '<:gone:2>']);
    expect(stored()).toHaveLength(3);
  });
});
