import { act, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
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

const AreaHarness = ({ onDismiss, atTop = true }: { onDismiss: () => void; atTop?: boolean }) => {
  const area = useRef<HTMLDivElement>(null);
  const drag = useDragToDismiss({ onDismiss, canStart: () => atTop, area });
  return (
    <div ref={area} data-testid="area" data-offset={drag.offset}>
      <p data-testid="content">Queue</p>
      <div data-testid="slider" className="touch-none" />
    </div>
  );
};

const touchPull = (target: HTMLElement, to: number, dx = 0) => {
  fireEvent.touchStart(target, { touches: [{ clientX: 100, clientY: 100 }] });
  const firstMoveKept = fireEvent.touchMove(target, { touches: [{ clientX: 100 + dx / 4, clientY: 100 + to / 4 }] });
  const kept = fireEvent.touchMove(target, { touches: [{ clientX: 100 + dx, clientY: 100 + to }] });
  return { firstMoveKept, kept, release: () => fireEvent.touchEnd(target, { changedTouches: [{ clientX: 100 + dx, clientY: 100 + to }] }) };
};

describe('useDragToDismiss on the sheet content', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('closes when the content is pulled down from the top, and keeps the page from scrolling', () => {
    const onDismiss = vi.fn();
    render(<AreaHarness onDismiss={onDismiss} />);
    const pull = touchPull(screen.getByTestId('content'), 200);
    expect(pull.firstMoveKept).toBe(false);
    expect(pull.kept).toBe(false);
    expect(screen.getByTestId('area')).toHaveAttribute('data-offset', '200');
    pull.release();
    act(() => { vi.advanceTimersByTime(300); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('leaves scrolling, sideways moves and controls with their own gestures alone', () => {
    const onDismiss = vi.fn();
    const { rerender } = render(<AreaHarness onDismiss={onDismiss} />);
    const content = screen.getByTestId('content');
    const up = touchPull(content, -200);
    expect(up.kept).toBe(true);
    up.release();
    const sideways = touchPull(content, 30, 200);
    expect(sideways.kept).toBe(true);
    sideways.release();
    const slider = touchPull(screen.getByTestId('slider'), 200);
    expect(slider.kept).toBe(true);
    slider.release();
    rerender(<AreaHarness onDismiss={onDismiss} atTop={false} />);
    const scrolled = touchPull(content, 200);
    expect(scrolled.kept).toBe(true);
    scrolled.release();
    act(() => { vi.advanceTimersByTime(300); });
    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.getByTestId('area')).toHaveAttribute('data-offset', '0');
  });
});
