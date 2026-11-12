import { describe, expect, it } from 'vitest';
import { moveItem, targetIndex } from './usePinnedReorder';

describe('pinned reorder helpers', () => {
  it('moves one item to a new index', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('finds the slot whose middle the dragged row crossed', () => {
    const middles = [30, 90, 150, 210];
    expect(targetIndex(middles, 0, 40)).toBe(0);
    expect(targetIndex(middles, 0, 100)).toBe(1);
    expect(targetIndex(middles, 0, 220)).toBe(3);
    expect(targetIndex(middles, 3, 80)).toBe(1);
    expect(targetIndex(middles, 3, 10)).toBe(0);
  });
});
