import { act, fireEvent, render } from '@testing-library/react';
import { CurrentUsernameContext } from '@/shared/contexts/CurrentUsernameContext';
import { afterEach, expect, it, vi } from 'vitest';
import { setSearchHighlight } from '@/shared/lib/searchHighlight';
import type { ReactNode } from 'react';
import { LinkedMessageText } from './LinkedMessageText';

vi.mock('./MessageLink', () => ({ MessageLink: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));

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

it('marks matches inside links and keeps the original address', () => {
  const { container } = render(<LinkedMessageText text="see https://example.com/docs" />);
  act(() => setSearchHighlight('example'));
  const link = container.querySelector('a')!;
  expect(link.getAttribute('href')).toBe('https://example.com/docs');
  expect(link.querySelector('mark')?.textContent).toBe('example');
});

it('turns @names into profile links and leaves e-mail addresses alone', () => {
  const { container } = render(<LinkedMessageText text="hi @anna and mail@host.com" />);
  const mentions = [...container.querySelectorAll('a[data-mention]')];
  expect(mentions.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([['@anna', '/@anna']]);
  expect(container.textContent).toBe('hi @anna and mail@host.com');
});

it('highlights mentions of the signed-in user', () => {
  const { container } = render(
    <CurrentUsernameContext.Provider value="Anna"><LinkedMessageText text="@anna and @bob" /></CurrentUsernameContext.Provider>,
  );
  expect([...container.querySelectorAll('[data-own-mention]')].map((link) => link.textContent)).toEqual(['@anna']);
});

it('shows @all as a highlight only when the server counted it', () => {
  const { container, rerender } = render(<LinkedMessageText text="@all look" mentionsAll />);
  expect(container.querySelector('[data-mention-all]')?.textContent).toBe('@all');
  rerender(<LinkedMessageText text="@all look" />);
  expect(container.querySelector('[data-mention-all]')).toBeNull();
  expect(container.querySelector('a')).toBeNull();
  expect(container).toHaveTextContent('@all look');
  rerender(<LinkedMessageText text="@ALL look" />);
  expect(container.querySelector('a')).toBeNull();
});

it('opens the profile in the app when a mention is clicked', () => {
  window.history.replaceState({}, '', '/chat/3');
  const { container } = render(<LinkedMessageText text="ask @anna" />);
  fireEvent.click(container.querySelector('a[data-mention]')!);
  expect(window.location.pathname).toBe('/chat/3/@anna');
  window.history.replaceState({}, '', '/');
});
