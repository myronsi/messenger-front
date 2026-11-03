import { describe, expect, it } from 'vitest';
import { isIgnoredTap } from './tapFilter';

const bubble = () => {
  document.body.innerHTML = '<div class="row"><div class="motion-message-bubble"><span class="text">hi</span><button>👍</button><img alt="" /></div></div>';
  return {
    text: document.querySelector('.text')!,
    reaction: document.querySelector('button')!,
    image: document.querySelector('img')!,
    row: document.querySelector('.row')!,
  };
};

describe('isIgnoredTap', () => {
  it('opens the menu only for a plain tap on the bubble', () => {
    const { text } = bubble();
    expect(isIgnoredTap({ target: text }, 0, 10_000)).toBe(false);
  });

  it('ignores taps on reactions, images and the empty space beside the bubble', () => {
    const { reaction, image, row } = bubble();
    expect(isIgnoredTap({ target: reaction }, 0, 10_000)).toBe(true);
    expect(isIgnoredTap({ target: image }, 0, 10_000)).toBe(true);
    expect(isIgnoredTap({ target: row }, 0, 10_000)).toBe(true);
  });

  it('takes ctrl, cmd and shift clicks anywhere on the message line, but not on its controls', () => {
    const { reaction, image, row } = bubble();
    expect(isIgnoredTap({ target: row, ctrlKey: true }, 0, 10_000)).toBe(false);
    expect(isIgnoredTap({ target: row, metaKey: true }, 0, 10_000)).toBe(false);
    expect(isIgnoredTap({ target: image, shiftKey: true }, 0, 10_000)).toBe(false);
    expect(isIgnoredTap({ target: reaction, ctrlKey: true }, 0, 10_000)).toBe(true);
  });

  it('ignores the tap that stops a scroll', () => {
    const { text } = bubble();
    expect(isIgnoredTap({ target: text }, 9_900, 10_000)).toBe(true);
  });
});
