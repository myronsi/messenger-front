import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ComposerNotice from './ComposerNotice';

describe('ComposerNotice', () => {
  afterEach(() => vi.useRealTimers());

  it('fades out by itself after a few seconds', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<ComposerNotice message="Recording was too short" closeLabel="Close" onDismiss={onDismiss} />);
    act(() => { vi.advanceTimersByTime(2900); });
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(100); });
    expect(screen.getByRole('status')).toHaveClass('motion-collapse-out');
    act(() => { vi.advanceTimersByTime(250); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('closes with the same animation when the cross is pressed', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<ComposerNotice message="No microphone found" closeLabel="Close" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByRole('status')).toHaveClass('motion-collapse-out');
    act(() => { vi.advanceTimersByTime(250); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
