import { coverZoom, displayedSize, type CropState, type ImageSize } from './crop';

export const CLIP_MAX_MS = 3000;
export const CLIP_MAX_BYTES = 15 * 1024 * 1024;

export interface StickerClip {
  kind: 'video' | 'image';
  startMs: number;
  endMs: number;
  crop: { x: number; y: number; size: number } | null;
}

export const clipKindOf = (type: string | undefined, animated = false): StickerClip['kind'] | null => {
  if (type?.startsWith('video/')) return 'video';
  return type === 'image/gif' || (animated && type === 'image/webp') ? 'image' : null;
};

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

const SHORTEST_WEBP_FRAME_MS = 10, DEFAULT_WEBP_FRAME_MS = 100;

const ascii = (bytes: Uint8Array, start: number) => String.fromCharCode(...bytes.subarray(start, start + 4));
const uint24 = (bytes: Uint8Array, at: number) => bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16);

export const webpDurationMs = (buffer: ArrayBuffer): number | null => {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 12 || ascii(bytes, 0) !== 'RIFF' || ascii(bytes, 8) !== 'WEBP') return null;
  const view = new DataView(buffer);
  let total = 0;
  let frames = 0;
  for (let at = 12; at + 8 <= bytes.length;) {
    const size = view.getUint32(at + 4, true);
    if (ascii(bytes, at) === 'ANMF' && at + 24 <= bytes.length) {
      const delay = uint24(bytes, at + 20);
      total += delay <= SHORTEST_WEBP_FRAME_MS ? DEFAULT_WEBP_FRAME_MS : delay;
      frames += 1;
    }
    at += 8 + size + (size & 1);
  }
  return frames > 0 ? total : null;
};

export const animatedImageDurationMs = (buffer: ArrayBuffer) => gifDurationMs(buffer) ?? webpDurationMs(buffer);

export const cropStyle = (size: ImageSize, crop: NonNullable<StickerClip['crop']>) => {
  const side = crop.size * Math.min(size.width, size.height);
  const percent = (value: number) => `${(value / side) * 100}%`;
  return { width: percent(size.width), height: percent(size.height), left: percent(-crop.x * size.width), top: percent(-crop.y * size.height) };
};
