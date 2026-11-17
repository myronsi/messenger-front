import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_QUICK_REACTIONS, quickReactions, recordReaction, resetReactionUsage, useQuickReactions } from './reactionUsage';

describe('personal quick reactions', () => {
  beforeEach(() => {
    localStorage.clear();
    resetReactionUsage();
  });

  it('starts with the defaults and puts the most used reactions first', () => {
    expect(quickReactions({})).toEqual(DEFAULT_QUICK_REACTIONS);
    expect(quickReactions({ '🔥': { count: 1, last: 5 }, '👍': { count: 3, last: 1 }, 'c:7': { count: 1, last: 9 } }))
      .toEqual(['👍', 'c:7', '🔥', '❤️', '😂', '🥰']);
  });

  it('remembers usage per account and updates the bar live', () => {
    const { result } = renderHook(() => useQuickReactions('1'));
    act(() => {
      recordReaction('1', '🔥', 1);
      recordReaction('1', '🔥', 2);
      recordReaction('2', '🎉', 3);
    });
    expect(result.current[0]).toBe('🔥');
    expect(result.current).not.toContain('🎉');
    resetReactionUsage();
    expect(renderHook(() => useQuickReactions('1')).result.current[0]).toBe('🔥');
    expect(renderHook(() => useQuickReactions('2')).result.current[0]).toBe('🎉');
  });
});
