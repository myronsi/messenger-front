import { expect, it } from 'vitest';
import { timeLayoutFromLines, type Box } from './useCompactMessageWidth';

const box = (left: number, right: number, top: number, bottom: number): Box => ({ left, right, top, bottom, height: bottom - top });

it('shrinks a wrapped message to its widest line', () => {
  const lines = [box(10, 230, 0, 20), box(10, 190, 20, 40)];
  expect(timeLayoutFromLines(10, lines, box(195, 240, 26, 40), 50, 300)).toEqual({ width: 230, below: false, metadataHeight: 14 });
});

it('keeps room for an inline timestamp that sticks out past the text', () => {
  const lines = [box(10, 100, 0, 20)];
  expect(timeLayoutFromLines(10, lines, box(108, 155.4, 6, 20), 55, 300)).toEqual({ width: 146, below: false, metadataHeight: 14 });
});

it('puts the timestamp below when it wrapped onto its own line', () => {
  const lines = [box(10, 290, 0, 20), box(10, 280, 20, 40)];
  expect(timeLayoutFromLines(10, lines, box(10, 55, 40, 54), 53, 300)).toEqual({ width: 280, below: true, metadataHeight: 14 });
});

it('keeps the timestamp width when the text below it is narrower', () => {
  const lines = [box(10, 40, 0, 20)];
  expect(timeLayoutFromLines(10, lines, box(10, 70, 20, 34), 60, 300)).toEqual({ width: 60, below: true, metadataHeight: 14 });
});

it('never exceeds the available width', () => {
  expect(timeLayoutFromLines(0, [box(0, 120.2, 0, 20)], box(80, 130, 6, 20), 50, 80)).toEqual({ width: 80, below: false, metadataHeight: 14 });
});
