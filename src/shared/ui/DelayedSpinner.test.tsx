import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DelayedSpinner } from './DelayedSpinner';

afterEach(() => vi.useRealTimers());

it('stays empty for a short load and shows the circle once loading takes longer', () => {
  vi.useFakeTimers();
  render(<DelayedSpinner label="Loading" />);
  expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  expect(screen.queryByTestId('delayed-spinner')).not.toBeInTheDocument();
  act(() => { vi.advanceTimersByTime(300); });
  expect(screen.getByTestId('delayed-spinner')).toBeInTheDocument();
});
