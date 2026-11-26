import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getClientSettings, resetClientSettingsForTests, PENDING_KEY } from '@/shared/lib/clientSettings/clientSettingsStore';
import {
  DEFAULT_QUICK_REACTIONS, adoptLegacyReactionUsage, legacyRecentReactions, quickReactions, recordReaction, resetReactionUsage, useQuickReactions,
} from './reactionUsage';

describe('personal quick reactions', () => {
  beforeEach(() => {
    localStorage.clear();
    resetClientSettingsForTests();
  });

  afterEach(() => vi.useRealTimers());

  it('starts with the defaults and puts the recent reactions first', () => {
    expect(quickReactions([])).toEqual(DEFAULT_QUICK_REACTIONS);
    expect(quickReactions(['🔥', '👍', 'c:7'])).toEqual(['🔥', '👍', 'c:7', '❤️', '😂', '🥰']);
  });

  it('keeps the newest reaction first, at most 8, and updates the bar live', () => {
    const { result } = renderHook(() => useQuickReactions('1'));
    act(() => {
      ['1', '2', '3', '4', '5', '6', '7', '8', '9'].forEach((value) => recordReaction('1', value));
      recordReaction('1', '3');
    });
    expect(result.current[0]).toBe('3');
    expect(getClientSettings().recentReactions).toEqual(['3', '9', '8', '7', '6', '5', '4', '2']);
    resetReactionUsage();
    expect(renderHook(() => useQuickReactions('1')).result.current[0]).toBe('3');
  });

  it('queues the change for the next sync', () => {
    recordReaction('1', '🔥');
    expect(JSON.parse(localStorage.getItem(PENDING_KEY) ?? '{}')).toEqual({ recentReactions: ['🔥'] });
  });

  it('turns the old per-account usage into a recent list once', () => {
    localStorage.setItem('messenger.reactionUsage.5', JSON.stringify({ '🔥': { count: 9, last: 1 }, '👍': { count: 1, last: 7 }, bad: 3 }));
    expect(legacyRecentReactions(localStorage.getItem('messenger.reactionUsage.5'))).toEqual(['👍', '🔥']);
    adoptLegacyReactionUsage('5');
    expect(getClientSettings().recentReactions).toEqual(['👍', '🔥']);
    expect(localStorage.getItem('messenger.reactionUsage.5')).toBeNull();
  });
});
