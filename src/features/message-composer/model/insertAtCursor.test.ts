import { expect, it } from 'vitest';
import { insertAtCursor } from './insertAtCursor';

it('inserts at the cursor and replaces a selection', () => {
  expect(insertAtCursor('hi there', '🙂', 2, 2)).toEqual({ value: 'hi🙂 there', caret: 4 });
  expect(insertAtCursor('hi there', '🙂', 3, 8)).toEqual({ value: 'hi 🙂', caret: 5 });
});
