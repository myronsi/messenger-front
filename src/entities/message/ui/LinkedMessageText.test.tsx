import { act, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { setSearchHighlight } from '@/shared/lib/searchHighlight';
import { LinkedMessageText } from './LinkedMessageText';

vi.mock('./MessageLink', () => ({ MessageLink: ({ children }: { children: string }) => <a href="#x">{children}</a> }));

afterEach(() => act(() => setSearchHighlight('')));

it('does not reserve invisible trailing spaces before the timestamp, preserving line breaks and indentation', () => {
  const text = 'First line   \n  Indented line\t \r\nLast line         ';
  const { container } = render(<LinkedMessageText text={text} />);
  expect(container.textContent).toBe('First line\n  Indented line\r\nLast line');
  expect(text).toBe('First line   \n  Indented line\t \r\nLast line         ');
});

it('marks every match of the search inside the message, ignoring case', () => {
  const { container } = render(<LinkedMessageText text="Old friends meet the OLD town" />);
  expect(container.querySelectorAll('mark')).toHaveLength(0);
  act(() => setSearchHighlight('old'));
  expect([...container.querySelectorAll('mark')].map((mark) => mark.textContent)).toEqual(['Old', 'OLD']);
  expect(container.textContent).toBe('Old friends meet the OLD town');
  act(() => setSearchHighlight(''));
  expect(container.querySelectorAll('mark')).toHaveLength(0);
});
