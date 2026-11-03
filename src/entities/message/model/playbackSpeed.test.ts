import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { nextPlaybackSpeed, usePlaybackSpeed } from './playbackSpeed';

describe('playback speed', () => {
  it('is shared by every voice message and cycles 1x, 1.5x, 2x', () => {
    const first = renderHook(() => usePlaybackSpeed());
    const second = renderHook(() => usePlaybackSpeed());
    expect(first.result.current).toBe(1);
    act(() => nextPlaybackSpeed());
    expect(second.result.current).toBe(1.5);
    act(() => nextPlaybackSpeed());
    act(() => nextPlaybackSpeed());
    expect(first.result.current).toBe(1);
  });
});
