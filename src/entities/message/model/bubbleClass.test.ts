import { expect, it } from 'vitest';
import { bubbleClass } from './bubbleClass';

const base = { isMine: true, showTail: true, isImage: false, isText: true, isSticker: false, hasReactions: false };

it('draws a coloured bubble with a tail for text', () => {
  expect(bubbleClass(base)).toContain('bg-primary');
  expect(bubbleClass(base)).toContain('message-tail-right');
  expect(bubbleClass({ ...base, isMine: false })).toContain('bg-accent');
});

it('shows a sticker without a bubble, border or tail', () => {
  const sticker = bubbleClass({ ...base, isText: false, isImage: true, isSticker: true, showTail: false });
  expect(sticker).not.toMatch(/bg-primary|bg-accent|border|message-tail/);
  expect(sticker).toContain('p-0');
});
