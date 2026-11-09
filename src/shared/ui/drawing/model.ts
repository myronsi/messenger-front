import type { components } from '@/shared/api/generated/schema';

export type Drawing = components['schemas']['Drawing'];
export type DrawingItem = components['schemas']['DrawingItem'];

export const DRAWING_VERSION = 1;
export const MAX_DRAWING_ITEMS = 200;
export const MAX_DRAWING_COORDINATES = 10000;
export const MAX_DRAWING_TEXT = 200;
export const DRAWING_COLORS = ['#ffffff', '#111111', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'] as const;
export const DEFAULT_SIZE_LEVEL = 0.35;
export const LINE_HEIGHT = 1.2;

const MIN_STEP = 0.002;
const TEXT_ADVANCE = 0.6;

export const roundCoordinate = (value: number) => Math.round(Math.min(1, Math.max(0, value)) * 10000) / 10000;

const precise = (value: number) => Math.round(value * 10000) / 10000;

export const strokeWidthAt = (level: number) => precise(0.002 * 30 ** Math.min(1, Math.max(0, level)));

export const textSizeAt = (level: number) => precise(0.025 * 8 ** Math.min(1, Math.max(0, level)));

export const toDrawing = (items: DrawingItem[]): Drawing | null => (items.length ? { version: DRAWING_VERSION, items } : null);

export const coordinateCount = (items: readonly DrawingItem[]) => items.reduce((total, item) => total + (item.points?.length ?? 0), 0);

export const textLines = (text = '') => text.split('\n');

export const shouldExtend = (points: readonly number[], x: number, y: number) => {
  const lastX = points[points.length - 2];
  const lastY = points[points.length - 1];
  return lastX === undefined || Math.hypot(x - lastX, y - lastY) >= MIN_STEP;
};

const segmentDistance = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax;
  const dy = by - ay;
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

export const hitsItem = (item: DrawingItem, x: number, y: number, aspect: number, radius: number) => {
  if (item.type === 'text') {
    const size = item.size ?? 0;
    const lines = textLines(item.text);
    const width = Math.max(...lines.map((line) => line.length)) * size * TEXT_ADVANCE / aspect;
    const height = lines.length * size * LINE_HEIGHT;
    const left = item.x ?? 0;
    const top = item.y ?? 0;
    return x >= left - radius && x <= left + width + radius && y >= top - radius && y <= top + height + radius;
  }
  const points = item.points ?? [];
  const reach = radius + (item.width ?? 0) * aspect / 2;
  for (let index = 0; index < points.length; index += 2) {
    const ax = points[index] * aspect;
    const ay = points[index + 1];
    const bx = (points[index + 2] ?? points[index]) * aspect;
    const by = points[index + 3] ?? points[index + 1];
    if (segmentDistance(x * aspect, y, ax, ay, bx, by) <= reach) return true;
  }
  return false;
};
