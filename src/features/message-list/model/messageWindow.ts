import type { Message } from '@/entities/message';

export const INITIAL_ROWS = 30;
export const FOCUS_ROWS = 15;
export const OVERSCAN_SCREENS = 2;
export const SLACK_SCREENS = 1;
export const EXCESS_SCREENS = 5;
export const DEFAULT_ROW_HEIGHT = 80;

export interface Span { start: number; end: number }
export interface WindowRange { startKey: string; endKey: string; atEnd: boolean }
export interface View { top: number; height: number }

export const messageKey = (message: Message) => String(message.client_temp_id ?? message.id);

const around = (index: number, count: number): Span => ({
  start: Math.max(0, index - FOCUS_ROWS), end: Math.min(count, index + FOCUS_ROWS + 1),
});

const rangeSpan = (range: WindowRange | null, indexOf: Map<string, number>, count: number): Span | null => {
  if (!range) return null;
  const first = indexOf.get(range.startKey);
  const last = range.atEnd ? count - 1 : indexOf.get(range.endKey);
  if (first === undefined && last === undefined) return null;
  const start = first ?? Math.max(0, last! - INITIAL_ROWS);
  const end = (last ?? Math.min(count - 1, start + INITIAL_ROWS)) + 1;
  return end > start ? { start, end } : null;
};

export const resolveSpan = (count: number, indexOf: Map<string, number>, range: WindowRange | null, focus: number[]): Span => {
  if (count === 0) return { start: 0, end: 0 };
  const base = rangeSpan(range, indexOf, count)
    ?? (focus.length ? around(Math.min(...focus), count) : { start: Math.max(0, count - INITIAL_ROWS), end: count });
  return focus.reduce((span, index) => ({ start: Math.min(span.start, index), end: Math.max(span.end, index + 1) }), base);
};

export const coversView = (span: Span, count: number, top: number, bottom: number, view: View) => {
  const viewBottom = view.top + view.height;
  const slack = view.height * SLACK_SCREENS;
  const excess = view.height * EXCESS_SCREENS;
  const above = span.start === 0 || top <= view.top - slack;
  const below = span.end === count || bottom >= viewBottom + slack;
  return above && below && top >= view.top - excess && bottom <= viewBottom + excess;
};

export const keepsView = (
  rendered: Span, own: Span, count: number, renderedBottoms: number[], heightAt: (index: number) => number, view: View,
) => {
  if (own.end <= own.start || own.start < rendered.start || own.end > rendered.end) return false;
  const top = renderedBottoms[own.start - rendered.start] - heightAt(own.start);
  const bottom = renderedBottoms[own.end - 1 - rendered.start];
  return coversView(own, count, top, bottom, view);
};

export const spanForView = (count: number, span: Span, renderedBottoms: number[], heightAt: (index: number) => number, view: View): Span => {
  const bottoms = new Array<number>(count);
  for (let index = span.start; index < span.end; index += 1) bottoms[index] = renderedBottoms[index - span.start];
  for (let index = span.start - 1; index >= 0; index -= 1) bottoms[index] = bottoms[index + 1] - heightAt(index + 1);
  for (let index = span.end; index < count; index += 1) bottoms[index] = bottoms[index - 1] + heightAt(index);
  const wantTop = view.top - view.height * OVERSCAN_SCREENS;
  const wantBottom = view.top + view.height * (1 + OVERSCAN_SCREENS);
  let start = 0;
  while (start < count - 1 && bottoms[start] <= wantTop) start += 1;
  let end = start + 1;
  while (end < count && bottoms[end] - heightAt(end) < wantBottom) end += 1;
  return { start, end };
};

export const sameRange = (left: WindowRange | null, right: WindowRange | null) => (
  left === right || (!!left && !!right && left.startKey === right.startKey && left.endKey === right.endKey && left.atEnd === right.atEnd)
);
