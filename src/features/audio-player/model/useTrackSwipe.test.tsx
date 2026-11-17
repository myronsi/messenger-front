import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTrackSwipe } from './useTrackSwipe';

const Harness = (props: Parameters<typeof useTrackSwipe>[0] & { onTap: () => void }) => {
  const swipe = useTrackSwipe(props);
  return <button type="button" data-testid="area" {...swipe.handlers} style={swipe.style} onClick={() => { if (!swipe.consumeSwipe()) props.onTap(); }}>x</button>;
};

const box = { left: 0, width: 300, top: 0, height: 56, right: 300, bottom: 56, x: 0, y: 0, toJSON: () => ({}) };

const setup = (overrides: Partial<Parameters<typeof useTrackSwipe>[0]> = {}) => {
  const props = { canNext: true, canPrevious: true, onNext: vi.fn(), onPrevious: vi.fn(), onTap: vi.fn(), ...overrides };
  render(<Harness {...props} />);
  const area = screen.getByTestId('area');
  area.getBoundingClientRect = () => box as DOMRect;
  return { props, area };
};

const drag = (area: HTMLElement, from: [number, number], to: [number, number], pointerType = 'touch') => {
  fireEvent.pointerDown(area, { clientX: from[0], clientY: from[1], pointerId: 1, pointerType });
  fireEvent.pointerMove(area, { clientX: to[0], clientY: to[1], pointerId: 1, pointerType });
  fireEvent.pointerUp(area, { clientX: to[0], clientY: to[1], pointerId: 1, pointerType });
};

describe('useTrackSwipe', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('goes to the next track after a long swipe left and slides the bar back in', () => {
    const { props, area } = setup();
    drag(area, [250, 20], [100, 24]);
    expect(area.style.transform).toBe('translateX(-300px)');
    act(() => { vi.advanceTimersByTime(200); });
    expect(props.onNext).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(20); });
    expect(area.style.transform).toBe('');
    fireEvent.click(area);
    expect(props.onTap).not.toHaveBeenCalled();
  });

  it('goes back after a swipe right', () => {
    const { props, area } = setup();
    drag(area, [50, 20], [200, 20]);
    act(() => { vi.advanceTimersByTime(200); });
    expect(props.onPrevious).toHaveBeenCalledTimes(1);
  });

  it('does not move or switch in a direction without a track', () => {
    const { props, area } = setup({ canNext: false, canPrevious: false });
    fireEvent.pointerDown(area, { clientX: 250, clientY: 20, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerMove(area, { clientX: 100, clientY: 20, pointerId: 1, pointerType: 'touch' });
    expect(area.style.transform).toBe('');
    fireEvent.pointerUp(area, { clientX: 100, clientY: 20, pointerId: 1, pointerType: 'touch' });
    drag(area, [50, 20], [250, 20]);
    act(() => { vi.advanceTimersByTime(300); });
    expect(props.onNext).not.toHaveBeenCalled();
    expect(props.onPrevious).not.toHaveBeenCalled();
    expect(area.style.transform).toBe('');
  });

  it('springs back on a short slow drag', () => {
    const { props, area } = setup();
    fireEvent.pointerDown(area, { clientX: 250, clientY: 20, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerMove(area, { clientX: 230, clientY: 20, pointerId: 1, pointerType: 'touch' });
    expect(area.style.transform).toBe('translateX(-20px)');
    fireEvent.pointerUp(area, { clientX: 230, clientY: 20, pointerId: 1, pointerType: 'touch' });
    act(() => { vi.advanceTimersByTime(300); });
    expect(props.onNext).not.toHaveBeenCalled();
    expect(area.style.transform).toBe('');
  });

  it('leaves vertical scrolling and mouse drags alone, and still opens on tap', () => {
    const { props, area } = setup();
    drag(area, [150, 10], [140, 80]);
    drag(area, [250, 20], [50, 20], 'mouse');
    act(() => { vi.advanceTimersByTime(300); });
    expect(props.onNext).not.toHaveBeenCalled();
    expect(area.style.transform).toBe('');
    fireEvent.click(area);
    expect(props.onTap).toHaveBeenCalled();
  });
});
