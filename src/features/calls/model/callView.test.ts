import { beforeEach, describe, expect, it } from 'vitest';
import {
  bubbleMorph, callViewStore, cornerPosition, dragAsMorphStart, maximizeCall, minimizeCall, nearestCorner, placeCallBubble, shouldMinimizeOnChatChange,
  swipeDragScale, swipeShouldMinimize,
} from './callView';

describe('call view', () => {
  beforeEach(() => {
    window.localStorage.clear();
    callViewStore.set({ mode: 'full', corner: 'bottom-right', stage: null });
  });

  it('switches between the full view and the bubble', () => {
    minimizeCall();
    expect(callViewStore.get().mode).toBe('mini');
    maximizeCall();
    expect(callViewStore.get().mode).toBe('full');
  });

  it('snaps a dropped bubble to the nearest corner', () => {
    expect(nearestCorner(100, 100, 1000, 800)).toBe('top-left');
    expect(nearestCorner(900, 100, 1000, 800)).toBe('top-right');
    expect(nearestCorner(100, 700, 1000, 800)).toBe('bottom-left');
    expect(nearestCorner(900, 700, 1000, 800)).toBe('bottom-right');
  });

  it('keeps the corners clear of the chat header and the message box', () => {
    const box = { size: 64, margin: 16, top: 80, bottom: 96 };
    expect(cornerPosition('top-left', 1000, 800, box)).toEqual({ left: 16, top: 80 });
    expect(cornerPosition('bottom-right', 1000, 800, box)).toEqual({ left: 920, top: 640 });
    expect(cornerPosition('top-right', 120, 150, box)).toEqual({ left: 40, top: 16 });
  });

  it('remembers the corner for the next call', () => {
    placeCallBubble('top-left');
    expect(callViewStore.get().corner).toBe('top-left');
    expect(window.localStorage.getItem('messenger:call-bubble-corner')).toBe('top-left');
  });

  it('minimizes only when another chat is opened', () => {
    expect(shouldMinimizeOnChatChange('5', '6', '5')).toBe(true);
    expect(shouldMinimizeOnChatChange('6', '5', '5')).toBe(false);
    expect(shouldMinimizeOnChatChange('5', '5', '5')).toBe(false);
    expect(shouldMinimizeOnChatChange('5', null, '5')).toBe(true);
  });

  it('shrinks the call view towards the centre of the bubble corner', () => {
    const box = { size: 64, margin: 16, top: 80, bottom: 96 };
    const morph = bubbleMorph({ left: 360, top: 0, width: 1080, height: 900 }, 'bottom-right', 1440, 900, box);
    expect(morph.origin).toBe('1032px 772px');
    expect(morph.scale).toBeCloseTo(64 / 1080);
  });

  it('pulls the view down a little smaller and minimizes after a long pull or a flick', () => {
    expect(swipeDragScale(0, 800)).toBe(1);
    expect(swipeDragScale(200, 800)).toBeCloseTo(0.9);
    expect(swipeDragScale(5000, 800)).toBe(0.8);
    expect(swipeShouldMinimize(100, 0.1, 800)).toBe(false);
    expect(swipeShouldMinimize(170, 0.1, 800)).toBe(true);
    expect(swipeShouldMinimize(60, 1.2, 800)).toBe(true);
    expect(swipeShouldMinimize(20, 3, 800)).toBe(false);
  });

  it('starts the shrink exactly where the dragged view is', () => {
    const drag = { offset: 120, scale: 0.9 };
    const width = 400;
    const originX = 350;
    const originY = 700;
    const start = dragAsMorphStart(drag, width, originX, originY);
    const [, tx, ty] = start.match(/translate\(([-\d.]+)px, ([-\d.]+)px\)/)!.map(Number);
    const corner = { x: 0, y: 0 };
    const dragged = { x: width / 2 + drag.scale * (corner.x - width / 2), y: drag.scale * corner.y + drag.offset };
    const morphed = { x: originX + drag.scale * (corner.x - originX) + tx, y: originY + drag.scale * (corner.y - originY) + ty };
    expect(morphed.x).toBeCloseTo(dragged.x);
    expect(morphed.y).toBeCloseTo(dragged.y);
  });
});
