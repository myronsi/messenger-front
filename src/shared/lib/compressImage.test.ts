import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canCompressImage, compressImageForUpload } from './compressImage';

const MB = 1024 * 1024;

interface FakeCanvas {
  width: number;
  height: number;
  getContext: () => unknown;
  toBlob: (callback: (blob: Blob | null) => void, type: string, quality?: number) => void;
}

let bitmapSize = { width: 1000, height: 800 };
let transparent = false;
let encodedSize: (type: string, canvas: FakeCanvas) => number = () => MB;
const encodings: { type: string; quality?: number; width: number; height: number }[] = [];
const close = vi.fn();

const sizedFile = (name: string, type: string, size: number) => {
  const file = new File(['x'], name, { type, lastModified: 5 });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

beforeEach(() => {
  bitmapSize = { width: 1000, height: 800 };
  transparent = false;
  encodedSize = () => MB;
  encodings.length = 0;
  close.mockClear();
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ ...bitmapSize, close })));
  const createElement = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
    if (tag !== 'canvas') return createElement(tag);
    const canvas: FakeCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        fillRect: vi.fn(),
        drawImage: vi.fn(),
        getImageData: () => ({ data: new Uint8ClampedArray([0, 0, 0, transparent ? 10 : 255]) }),
      }),
      toBlob: (callback, type, quality) => {
        encodings.push({ type, quality, width: canvas.width, height: canvas.height });
        const blob = new Blob(['y'], { type });
        Object.defineProperty(blob, 'size', { value: encodedSize(type, canvas) });
        callback(blob);
      },
    };
    return canvas;
  }) as typeof document.createElement);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('compressImageForUpload', () => {
  it('keeps small images as they are', async () => {
    const file = sizedFile('photo.jpg', 'image/jpeg', 2 * MB);
    expect(await compressImageForUpload(file)).toBe(file);
    expect(encodings).toEqual([]);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('downscales images with a long edge over 4096 px to a JPEG', async () => {
    bitmapSize = { width: 8192, height: 4096 };
    const result = await compressImageForUpload(sizedFile('wide.webp', 'image/webp', 5 * MB));
    expect(encodings).toEqual([{ type: 'image/jpeg', quality: 0.85, width: 4096, height: 2048 }]);
    expect(result).toMatchObject({ name: 'wide.jpg', type: 'image/jpeg', lastModified: 5 });
  });

  it('compresses images over the size limit and shrinks further until they fit', async () => {
    encodedSize = (_type, canvas) => (canvas.width >= 1000 ? 25 * MB : 3 * MB);
    const result = await compressImageForUpload(sizedFile('big.jpeg', 'image/jpeg', 30 * MB));
    expect(encodings.map(({ width }) => width)).toEqual([1000, 750]);
    expect(result).toMatchObject({ name: 'big.jpg', type: 'image/jpeg' });
  });

  it('keeps a transparent PNG as PNG when it fits the limit', async () => {
    bitmapSize = { width: 6000, height: 3000 };
    transparent = true;
    const result = await compressImageForUpload(sizedFile('logo.png', 'image/png', 8 * MB));
    expect(encodings.map(({ type }) => type)).toEqual(['image/png']);
    expect(result).toMatchObject({ name: 'logo.png', type: 'image/png' });
  });

  it('turns an opaque PNG into a JPEG', async () => {
    const result = await compressImageForUpload(sizedFile('screen.png', 'image/png', 22 * MB));
    expect(encodings.map(({ type }) => type)).toEqual(['image/jpeg']);
    expect(result.name).toBe('screen.jpg');
  });

  it('skips GIF, SVG and HEIC files', async () => {
    const files = [sizedFile('a.gif', 'image/gif', 30 * MB), sizedFile('b.svg', 'image/svg+xml', 30 * MB), sizedFile('c.heic', 'image/heic', 30 * MB)];
    for (const file of files) {
      expect(canCompressImage(file)).toBe(false);
      expect(await compressImageForUpload(file)).toBe(file);
    }
    expect(createImageBitmap).not.toHaveBeenCalled();
  });

  it('returns the original file when the image cannot be decoded', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => { throw new Error('broken'); }));
    const file = sizedFile('broken.jpg', 'image/jpeg', 30 * MB);
    expect(await compressImageForUpload(file)).toBe(file);
  });

  it('does nothing without createImageBitmap', async () => {
    vi.stubGlobal('createImageBitmap', undefined);
    const file = sizedFile('photo.jpg', 'image/jpeg', 30 * MB);
    expect(canCompressImage(file)).toBe(false);
    expect(await compressImageForUpload(file)).toBe(file);
  });
});
