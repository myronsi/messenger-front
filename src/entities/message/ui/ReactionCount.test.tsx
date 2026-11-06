import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReactionCount } from './ReactionCount';

const setReducedMotion = (reduce: boolean) => {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('reduce'), addEventListener: vi.fn(), removeEventListener: vi.fn() }));
};

describe('ReactionCount', () => {
  it('rolls from the old number to the new one', () => {
    setReducedMotion(false);
    const { rerender } = render(<ReactionCount count={2} />);
    rerender(<ReactionCount count={3} />);
    expect(screen.getByTestId('reaction-count').textContent).toBe('23');
    expect(screen.getByText('3').className).toContain('reaction-count-in-up');
    vi.unstubAllGlobals();
  });

  it('switches without animation when reduced motion is preferred', () => {
    setReducedMotion(true);
    const { rerender } = render(<ReactionCount count={3} />);
    rerender(<ReactionCount count={2} />);
    expect(screen.getByTestId('reaction-count').textContent).toBe('2');
    vi.unstubAllGlobals();
  });
});
