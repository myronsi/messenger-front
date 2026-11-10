import { describe, expect, it } from 'vitest';
import { messageMenuPlacement } from './menuAnchor';

const rowWithBubbleAt = (top: number) => {
  const row = document.createElement('div');
  const bubble = document.createElement('div');
  bubble.className = 'motion-message-bubble';
  bubble.getBoundingClientRect = () => ({ top, bottom: top + 80, left: 0, right: 200, width: 200, height: 80, x: 0, y: top, toJSON: () => ({}) });
  row.appendChild(bubble);
  return row;
};

describe('messageMenuPlacement', () => {
  it('opens both menus at the tap, to the right while there is room', () => {
    expect(messageMenuPlacement({ clientX: 100, clientY: 300 })).toEqual({ reaction: { x: 100, y: 255 }, context: { x: 100, y: 300 }, openLeft: false });
  });

  it('opens both menus to the left near the right edge', () => {
    expect(messageMenuPlacement({ clientX: window.innerWidth - 50, clientY: 300 }).openLeft).toBe(true);
  });

  it('places the reaction bar above the message bubble instead of the tap', () => {
    const placement = messageMenuPlacement({ clientX: 100, clientY: 300 }, rowWithBubbleAt(200));
    expect(placement.reaction).toEqual({ x: 100, y: 155 });
    expect(placement.context).toEqual({ x: 100, y: 300 });
  });

  it('falls back to the tap when the bubble top is off screen', () => {
    expect(messageMenuPlacement({ clientX: 100, clientY: 300 }, rowWithBubbleAt(20)).reaction.y).toBe(255);
  });
});
