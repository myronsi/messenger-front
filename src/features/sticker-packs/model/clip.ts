import { coverZoom, displayedSize, type CropState, type ImageSize } from './crop';

export const CLIP_MAX_MS = 3000;
export const CLIP_MAX_BYTES = 15 * 1024 * 1024;

export interface StickerClip {
  kind: 'video' | 'image';
  startMs: number;
  endMs: number;
  crop: { x: number; y: number; size: number } | null;
}

export const isClipType = (type: string | undefined) => !!type && (type.startsWith('video/') || type === 'image/gif');

export const clipKind = (type: string): StickerClip['kind'] => (type === 'image/gif' ? 'image' : 'video');

export const initialTrim = (durationMs: number): [number, number] => [0, Math.min(CLIP_MAX_MS, Math.max(0, durationMs))];

export const adjustTrim = (previous: [number, number], next: [number, number], durationMs: number): [number, number] => {
  let [start, end] = next;
  start = Math.max(0, Math.min(start, durationMs));
  end = Math.max(start, Math.min(end, durationMs));
  if (end - start <= CLIP_MAX_MS) return [start, end];
  if (start !== previous[0]) return [start, Math.min(durationMs, start + CLIP_MAX_MS)];
  return [Math.max(0, end - CLIP_MAX_MS), end];
};

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

export const cropFractions = (size: ImageSize, crop: CropState) => {
  const zoom = Math.max(crop.zoom, coverZoom(size));
  const drawn = displayedSize(size, zoom, 1);
  const left = drawn.width / 2 - 0.5 - crop.x;
  const top = drawn.height / 2 - 0.5 - crop.y;
  const side = clamp(1 / Math.min(drawn.width, drawn.height), 0.000001, 1);
  const sideOfWidth = 1 / drawn.width, sideOfHeight = 1 / drawn.height;
  return {
    x: clamp(left / drawn.width, 0, Math.max(0, 1 - sideOfWidth)),
    y: clamp(top / drawn.height, 0, Math.max(0, 1 - sideOfHeight)),
    size: side,
  };
};

const GIF_TRAILER = 0x3b, GIF_EXTENSION = 0x21, GIF_IMAGE = 0x2c, GIF_CONTROL = 0xf9;

const skipBlocks = (bytes: Uint8Array, offset: number) => {
  let at = offset;
  while (at < bytes.length && bytes[at] !== 0) at += bytes[at] + 1;
  return at + 1;
};

export const gifDurationMs = (buffer: ArrayBuffer): number | null => {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 13 || String.fromCharCode(...bytes.subarray(0, 3)) !== 'GIF') return null;
  let at = 13 + ((bytes[10] & 0x80) ? 3 * (2 ** ((bytes[10] & 0x07) + 1)) : 0);
  let total = 0;
  let frames = 0;
  while (at < bytes.length && bytes[at] !== GIF_TRAILER) {
    if (bytes[at] === GIF_EXTENSION) {
      if (bytes[at + 1] === GIF_CONTROL && at + 5 < bytes.length) {
        const delay = bytes[at + 4] | (bytes[at + 5] << 8);
        total += (delay < 2 ? 10 : delay) * 10;
      }
      at = skipBlocks(bytes, at + 2);
    } else if (bytes[at] === GIF_IMAGE) {
      frames += 1;
      const packed = bytes[at + 9] ?? 0;
      at += 10 + ((packed & 0x80) ? 3 * (2 ** ((packed & 0x07) + 1)) : 0);
      at = skipBlocks(bytes, at + 1);
    } else {
      return null;
    }
  }
  return frames > 0 ? total : null;
};
