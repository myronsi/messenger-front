import { afterEach, describe, expect, it, vi } from 'vitest';
import { findMiniCover, flyCover } from './coverFlight';

const rect = (left: number, top: number, size: number) => ({
  left, top, width: size, height: size, right: left + size, bottom: top + size, x: left, y: top, toJSON: () => ({}),
}) as DOMRect;

describe('coverFlight', () => {
  afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); });

  it('finds the mini cover that is on screen', () => {
    document.body.innerHTML = '<span data-mini-cover id="hidden"></span><span data-mini-cover id="shown"></span>';
    const [hidden, shown] = [...document.querySelectorAll<HTMLElement>('[data-mini-cover]')];
    hidden.getBoundingClientRect = () => rect(0, 0, 0);
    shown.getBoundingClientRect = () => rect(10, 10, 36);
    expect(findMiniCover()).toBe(shown);
  });

  it('flies a copy of the cover from one box to the other and removes it at the end', () => {
    const source = document.createElement('span');
    source.setAttribute('data-mini-cover', '');
    document.body.appendChild(source);
    const animation = { onfinish: null as null | (() => void), oncancel: null };
    const animate = vi.fn(() => animation);
    source.animate = animate as never;
    HTMLElement.prototype.animate = animate as never;
    const onDone = vi.fn();
    flyCover({ source, from: rect(10, 700, 36), to: rect(60, 120, 260), fromRadius: '8px', toRadius: '16px', duration: 480, onDone });
    const ghost = document.querySelector<HTMLElement>('[data-cover-flight]')!;
    expect(ghost).not.toHaveAttribute('data-mini-cover');
    expect(animate).toHaveBeenCalledWith([
      { transform: 'translate(10px, 700px)', width: '36px', height: '36px', borderRadius: '8px' },
      { transform: 'translate(60px, 120px)', width: '260px', height: '260px', borderRadius: '16px' },
    ], expect.objectContaining({ duration: 480, fill: 'forwards' }));
    animation.onfinish?.();
    expect(document.querySelector('[data-cover-flight]')).toBeNull();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('cleans up even when the animation clock never runs', () => {
    vi.useFakeTimers();
    const source = document.createElement('span');
    document.body.appendChild(source);
    source.animate = vi.fn(() => ({ onfinish: null, oncancel: null })) as never;
    HTMLElement.prototype.animate = source.animate;
    const onDone = vi.fn();
    flyCover({ source, from: rect(0, 0, 36), to: rect(0, 0, 260), fromRadius: '8px', toRadius: '16px', duration: 480, onDone });
    expect(document.querySelector('[data-cover-flight]')).not.toBeNull();
    vi.advanceTimersByTime(700);
    expect(document.querySelector('[data-cover-flight]')).toBeNull();
    expect(onDone).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
