import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ComposerReveal } from './ComposerReveal';

afterEach(() => vi.useRealTimers());

it('keeps the last content on screen while it collapses, then removes it', () => {
  vi.useFakeTimers();
  const view = render(<ComposerReveal show>{<span>Reply to Anna</span>}</ComposerReveal>);
  expect(screen.getByTestId('composer-reveal')).toHaveClass('motion-collapse-in');
  view.rerender(<ComposerReveal show={false}>{null}</ComposerReveal>);
  expect(screen.getByText('Reply to Anna')).toBeInTheDocument();
  expect(screen.getByTestId('composer-reveal')).toHaveClass('motion-collapse-out');
  expect(screen.getByTestId('composer-reveal')).toHaveAttribute('aria-hidden', 'true');
  act(() => { vi.advanceTimersByTime(220); });
  expect(screen.queryByTestId('composer-reveal')).toBeNull();
});

it('opens again when shown during the collapse', () => {
  vi.useFakeTimers();
  const view = render(<ComposerReveal show>{<span>one</span>}</ComposerReveal>);
  view.rerender(<ComposerReveal show={false}>{null}</ComposerReveal>);
  view.rerender(<ComposerReveal show>{<span>two</span>}</ComposerReveal>);
  act(() => { vi.advanceTimersByTime(300); });
  expect(screen.getByText('two')).toBeInTheDocument();
  expect(screen.getByTestId('composer-reveal')).toHaveClass('motion-collapse-in');
});
