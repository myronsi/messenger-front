import { describe, expect, it } from 'vitest';
import { dropIndex } from './useQueueDrag';

describe('dropIndex', () => {
  it('moves by whole rows and stays inside the list', () => {
    expect(dropIndex(1, 10, 44, 4)).toBe(1);
    expect(dropIndex(1, 50, 44, 4)).toBe(2);
    expect(dropIndex(1, -200, 44, 4)).toBe(0);
    expect(dropIndex(1, 400, 44, 4)).toBe(3);
  });
});
