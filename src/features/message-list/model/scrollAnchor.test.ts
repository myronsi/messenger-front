import { describe, expect, it } from 'vitest';
import { keepRowsInPlace, measureRowLayout } from './scrollAnchor';

const setup = (heights: number[]) => {
  const state = { scrollTop: 0, heights: [...heights] };
  const container = document.createElement('div');
  Object.defineProperty(container, 'scrollTop', {
    configurable: true, get: () => state.scrollTop, set: (value: number) => { state.scrollTop = value; },
  });
  container.getBoundingClientRect = () => ({ top: 50 }) as DOMRect;
  const rows = heights.map((_height, index) => {
    const row = document.createElement('div');
    row.getBoundingClientRect = () => {
      const bottom = state.heights.slice(0, index + 1).reduce((sum, height) => sum + height, 0);
      return { bottom: 50 + bottom - state.scrollTop } as DOMRect;
    };
    container.appendChild(row);
    return row;
  });
  document.body.appendChild(container);
  return { container, rows, state };
};

describe('keepRowsInPlace', () => {
  it('keeps the visible rows still when rows above them grow', () => {
    const { container, rows, state } = setup([100, 100, 100, 100, 100, 100]);
    state.scrollTop = 250;
    const layout = measureRowLayout(container, rows);
    state.heights[0] = 400;
    expect(keepRowsInPlace(container, layout)).toBe('kept');
    expect(state.scrollTop).toBe(550);
  });

  it('ignores rows that change below the viewport', () => {
    const { container, rows, state } = setup([100, 100, 100, 100, 100, 100]);
    state.scrollTop = 120;
    const layout = measureRowLayout(container, rows);
    state.heights[5] = 300;
    keepRowsInPlace(container, layout);
    expect(state.scrollTop).toBe(120);
  });

  it('stays valid after the user scrolls, because positions are kept in content coordinates', () => {
    const { container, rows, state } = setup([100, 100, 100, 100, 100, 100]);
    state.scrollTop = 300;
    const layout = measureRowLayout(container, rows);
    state.scrollTop = 150;
    state.heights[0] = 160;
    keepRowsInPlace(container, layout);
    expect(state.scrollTop).toBe(210);
  });

  it('reports a lost anchor when the visible rows were replaced', () => {
    const { container, rows, state } = setup([100, 100, 100, 100, 100, 100]);
    state.scrollTop = 100;
    const layout = measureRowLayout(container, rows);
    rows.forEach((row) => row.remove());
    expect(keepRowsInPlace(container, layout)).toBe('lost');
    expect(state.scrollTop).toBe(100);
  });

  it('uses the next visible row when the first one was removed', () => {
    const { container, rows, state } = setup([100, 100, 100, 100, 100, 100]);
    state.scrollTop = 150;
    const layout = measureRowLayout(container, rows);
    rows[1].remove();
    state.heights[0] = 180;
    expect(keepRowsInPlace(container, layout)).toBe('kept');
    expect(state.scrollTop).toBe(230);
  });
});
