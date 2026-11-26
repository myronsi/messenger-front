import { describe, expect, it, vi } from 'vitest';
import { stickerSourceOf, VIDEO_STICKER_MAX_BYTES } from './stickerSource';

vi.mock('@/entities/sticker', () => ({ makeStickerFrom: vi.fn() }));

const item = (file_type: string, file_size = 1000) => ({ file_type, file_size, file_url: '/media/1', file_name: 'a' });

describe('stickerSourceOf', () => {
  it('accepts images and short videos only', () => {
    expect(stickerSourceOf(item('image/webp'))).toBe('/media/1');
    expect(stickerSourceOf(item('video/mp4', VIDEO_STICKER_MAX_BYTES))).toBe('/media/1');
    expect(stickerSourceOf(item('video/mp4', VIDEO_STICKER_MAX_BYTES + 1))).toBeNull();
    expect(stickerSourceOf(item('application/pdf'))).toBeNull();
  });
});
