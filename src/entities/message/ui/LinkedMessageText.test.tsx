import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { LinkedMessageText } from './LinkedMessageText';

it('does not reserve invisible trailing spaces before the timestamp, preserving line breaks and indentation', () => {
  const text = 'First line   \n  Indented line\t \r\nLast line         ';
  const { container } = render(<LinkedMessageText text={text} />);
  expect(container.textContent).toBe('First line\n  Indented line\r\nLast line');
  expect(text).toBe('First line   \n  Indented line\t \r\nLast line         ');
});
