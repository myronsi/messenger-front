import { describe, expect, it } from 'vitest';
import { messageMenuPlacement } from './menuAnchor';

describe('messageMenuPlacement', () => {
  it('opens both menus at the tap, to the right while there is room', () => {
    expect(messageMenuPlacement({ clientX: 100, clientY: 300 })).toEqual({ reaction: { x: 100, y: 255 }, context: { x: 100, y: 300 }, openLeft: false });
  });

  it('opens both menus to the left near the right edge', () => {
    expect(messageMenuPlacement({ clientX: window.innerWidth - 50, clientY: 300 }).openLeft).toBe(true);
  });
});
