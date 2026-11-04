import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const cache = vi.hoisted(() => ({ cancel: vi.fn(), preloadMedia: vi.fn() }));

vi.mock('./mediaCache', () => ({ preloadMedia: cache.preloadMedia }));

import { useMediaPreload } from './useMediaPreload';

describe('useMediaPreload', () => {
  it('cancels a hover preload when the pointer leaves, the address changes or the row unmounts', () => {
    cache.preloadMedia.mockReturnValue(cache.cancel);
    const { result, rerender, unmount } = renderHook(({ url }) => useMediaPreload(url), { initialProps: { url: '/a' } });

    act(() => result.current.onPointerEnter());
    act(() => result.current.onPointerLeave());
    expect(cache.cancel).toHaveBeenCalledTimes(1);

    act(() => result.current.onPointerEnter());
    rerender({ url: '/b' });
    expect(cache.cancel).toHaveBeenCalledTimes(2);

    act(() => result.current.onPointerEnter());
    unmount();
    expect(cache.cancel).toHaveBeenCalledTimes(3);
    expect(cache.preloadMedia).toHaveBeenLastCalledWith('/b');
  });
});
