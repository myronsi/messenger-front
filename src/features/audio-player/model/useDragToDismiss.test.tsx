import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDragToDismiss } from './useDragToDismiss';

const Harness = ({ onDismiss, atTop = true }: { onDismiss: () => void; atTop?: boolean }) => {
  const drag = useDragToDismiss({ onDismiss, canStart: () => atTop });
  return <div data-testid="handle" data-offset={drag.offset} data-dismissed={drag.dismissed || undefined} {...drag.handlers} />;
};

const pull = (handle: HTMLElement, to: number, pointerType = 'touch') => {
  fireEvent.pointerDown(handle, { clientX: 100, clientY: 100, pointerId: 1, pointerType });
  fireEvent.pointerMove(handle, { clientX: 100, clientY: 100 + to, pointerId: 1, pointerType });
  return () => fireEvent.pointerUp(handle, { clientX: 100, clientY: 100 + to, pointerId: 1, pointerType });
};

describe('useDragToDismiss', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('follows the finger down and dismisses after a long pull', () => {
    const onDismiss = vi.fn();
    render(<Harness onDismiss={onDismiss} />);
    const handle = screen.getByTestId('handle');
    const release = pull(handle, 200);
    expect(handle).toHaveAttribute('data-offset', '200');
    release();
    expect(handle).toHaveAttribute('data-dismissed', 'true');
    act(() => { vi.advanceTimersByTime(300); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('springs back after a short pull and ignores upward, mouse and scrolled starts', () => {
    const onDismiss = vi.fn();
    const { rerender } = render(<Harness onDismiss={onDismiss} />);
    const handle = screen.getByTestId('handle');
    vi.setSystemTime(0);
    const release = pull(handle, 30);
    vi.setSystemTime(1000);
    release();
    expect(handle).toHaveAttribute('data-offset', '0');
    pull(handle, -80)();
    pull(handle, 200, 'mouse')();
    rerender(<Harness onDismiss={onDismiss} atTop={false} />);
    pull(handle, 200)();
    act(() => { vi.advanceTimersByTime(300); });
    expect(onDismiss).not.toHaveBeenCalled();
    expect(handle).toHaveAttribute('data-offset', '0');
  });
});
