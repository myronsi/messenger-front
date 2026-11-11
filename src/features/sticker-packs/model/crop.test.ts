import { describe, expect, it, vi } from 'vitest';
import { clampZoom, coverZoom, displayedSize, drawCrop, initialCrop } from './crop';
import { packLink } from './reorder';
import { stickerLinkSlug } from './stickerLink';
import { stickerErrorText } from './stickerErrors';
import { en } from '@/shared/lang/en/bundle';

describe('crop', () => {
  const wide = { width: 1200, height: 600 };

  it('starts filling the square and can zoom out to show the whole picture', () => {
    expect(coverZoom(wide)).toBe(2);
    expect(initialCrop(wide)).toEqual({ zoom: 2, x: 0, y: 0 });
    expect(displayedSize(wide, 1, 512)).toEqual({ width: 512, height: 256 });
    expect(clampZoom(0.2, wide)).toBe(1);
    expect(clampZoom(100, wide)).toBe(6);
  });

  it('draws the picture centred and moved by the offset', () => {
    const context = { clearRect: vi.fn(), drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;
    drawCrop(context, {} as CanvasImageSource, wide, { zoom: 2, x: 0.25, y: 0 });
    expect(context.drawImage).toHaveBeenCalledWith({}, 128 - 256, 0, 1024, 512);
  });
});

describe('pack helpers', () => {
  it('builds and reads share links', () => {
    expect(packLink('ABCDEFGHJKLM', 'https://chat.example')).toBe('https://chat.example/stickers/ABCDEFGHJKLM');
    expect(stickerLinkSlug('/stickers/ABCDEFGHJKLM')).toBe('ABCDEFGHJKLM');
    expect(stickerLinkSlug('/stickers/ab')).toBeNull();
    expect(stickerLinkSlug('/dm/@bob')).toBeNull();
  });

  it('explains why a sticker could not be saved', () => {
    expect(stickerErrorText({ status: 413 }, en)).toBe(en.stickerImageTooLarge);
    expect(stickerErrorText({ status: 409 }, en, 'pack')).toBe(en.stickerPackLimit);
    expect(stickerErrorText({ status: 409 }, en)).toBe(en.stickerLimit);
    expect(stickerErrorText(new Error('offline'), en)).toBe(en.stickerSaveFailed);
  });
});
