import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useStickerSource } from './useStickerSource';

const header = (flags: number) => new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 30, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x58, 10, 0, 0, 0, flags, 0, 0, 0, 0, 0, 0, 0, 0, 0,
]);

afterEach(() => vi.unstubAllGlobals());

it('marks a picked animated WebP as animated', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ blob: async () => new Blob([header(0x02)], { type: 'image/webp' }) })));
  const { result } = renderHook(() => useStickerSource('blob:anim', 'image/webp'));
  await waitFor(() => expect(result.current).toEqual({ url: 'blob:anim', failed: false, type: 'image/webp', animated: true }));
});

it('keeps a still WebP a still picture', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ blob: async () => new Blob([header(0x10)], { type: 'image/webp' }) })));
  const { result } = renderHook(() => useStickerSource('blob:still', 'image/webp'));
  await waitFor(() => expect(result.current.url).toBe('blob:still'));
  expect(result.current.animated).toBe(false);
});

it('does not read other picked files', () => {
  const fetchSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);
  const { result } = renderHook(() => useStickerSource('blob:png', 'image/png'));
  expect(result.current).toEqual({ url: 'blob:png', failed: false, type: 'image/png', animated: false });
  expect(fetchSpy).not.toHaveBeenCalled();
});
