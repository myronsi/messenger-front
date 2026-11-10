import { describe, expect, it } from 'vitest';
import { messageMenuPlacement, reactionBarPosition } from './menuAnchor';

describe('messageMenuPlacement', () => {
  it('opens both menus at the tap, to the right while there is room', () => {
    expect(messageMenuPlacement({ clientX: 100, clientY: 300 })).toEqual({ reaction: { x: 100, y: 255 }, context: { x: 100, y: 300 }, openLeft: false });
  });

  it('opens both menus to the left near the right edge', () => {
    expect(messageMenuPlacement({ clientX: window.innerWidth - 50, clientY: 300 }).openLeft).toBe(true);
  });

  it('keeps the first reaction position on screen near the top', () => {
    expect(messageMenuPlacement({ clientX: 100, clientY: 20 }).reaction.y).toBe(8);
  });
});

describe('reactionBarPosition', () => {
  const menu = { top: 300, left: 100, right: 300, width: 200 };
  const bar = { width: 240, height: 44 };

  it('sits right above the context menu, aligned to its left edge', () => {
    expect(reactionBarPosition(menu, bar, false, 1024)).toEqual({ x: 100, y: 250 });
  });

  it('aligns to the right edge of the menu when the menu opens to the left', () => {
    expect(reactionBarPosition(menu, bar, true, 1024)).toEqual({ x: 60, y: 250 });
  });

  it('stays inside the viewport', () => {
    expect(reactionBarPosition({ top: 20, left: 900, right: 1100, width: 200 }, bar, false, 1024)).toEqual({ x: 776, y: 8 });
  });
});
