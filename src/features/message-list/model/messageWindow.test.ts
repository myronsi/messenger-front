import { describe, expect, it } from 'vitest';
import { FOCUS_ROWS, INITIAL_ROWS, coversView, resolveSpan, sameRange, spanForView } from './messageWindow';

const keys = (count: number) => Array.from({ length: count }, (_, index) => `m${index}`);
const indexOf = (count: number) => new Map(keys(count).map((key, index) => [key, index]));

describe('resolveSpan', () => {
  it('starts with the newest rows', () => {
    expect(resolveSpan(100, indexOf(100), null, [])).toEqual({ start: 100 - INITIAL_ROWS, end: 100 });
  });

  it('starts around the first focused row', () => {
    expect(resolveSpan(100, indexOf(100), null, [40])).toEqual({ start: 40 - FOCUS_ROWS, end: 40 + FOCUS_ROWS + 1 });
  });

  it('keeps the same rows when an older page is prepended', () => {
    const range = { startKey: 'm10', endKey: 'm20', atEnd: false };
    const prepended = new Map([...indexOf(30)].map(([key, index]) => [key, index + 50]));
    expect(resolveSpan(80, prepended, range, [])).toEqual({ start: 60, end: 71 });
  });

  it('follows new rows when the window reaches the end', () => {
    const range = { startKey: 'm10', endKey: 'm19', atEnd: true };
    expect(resolveSpan(25, indexOf(25), range, [])).toEqual({ start: 10, end: 25 });
  });

  it('stretches to include a jump target outside the window', () => {
    const range = { startKey: 'm70', endKey: 'm90', atEnd: false };
    expect(resolveSpan(100, indexOf(100), range, [5])).toEqual({ start: 5, end: 91 });
  });

  it('falls back to the newest rows when both ends are gone', () => {
    const range = { startKey: 'gone', endKey: 'also-gone', atEnd: false };
    expect(resolveSpan(50, indexOf(50), range, [])).toEqual({ start: 50 - INITIAL_ROWS, end: 50 });
  });
});

describe('coversView', () => {
  const view = { top: 1000, height: 500 };

  it('accepts rows that reach a screen beyond the view on both sides', () => {
    expect(coversView({ start: 10, end: 40 }, 100, 400, 2100, view)).toBe(true);
  });

  it('asks for more rows when the view nears the rendered edge', () => {
    expect(coversView({ start: 10, end: 40 }, 100, 800, 2100, view)).toBe(false);
  });

  it('does not ask for rows past the ends of the list', () => {
    expect(coversView({ start: 0, end: 100 }, 100, 900, 1600, view)).toBe(true);
  });

  it('asks to drop rows far outside the view', () => {
    expect(coversView({ start: 0, end: 100 }, 100, -5000, 1600, view)).toBe(false);
  });
});

describe('spanForView', () => {
  it('picks the rows two screens around the view using estimates outside the window', () => {
    const bottoms = Array.from({ length: 10 }, (_, offset) => 5000 + (offset + 1) * 100);
    const span = spanForView(200, { start: 50, end: 60 }, bottoms, () => 100, { top: 2000, height: 500 });
    expect(span).toEqual({ start: 10, end: 35 });
  });

  it('keeps at least one row', () => {
    expect(spanForView(3, { start: 0, end: 3 }, [100, 200, 300], () => 100, { top: 9000, height: 500 })).toEqual({ start: 2, end: 3 });
  });
});

describe('sameRange', () => {
  it('compares by value', () => {
    expect(sameRange({ startKey: 'a', endKey: 'b', atEnd: false }, { startKey: 'a', endKey: 'b', atEnd: false })).toBe(true);
    expect(sameRange({ startKey: 'a', endKey: 'b', atEnd: false }, { startKey: 'a', endKey: 'b', atEnd: true })).toBe(false);
    expect(sameRange(null, null)).toBe(true);
  });
});
