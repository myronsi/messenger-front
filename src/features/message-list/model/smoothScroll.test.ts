import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { animateScroll, easeInOutSine, maxGlideDistance, scrollDuration } from './smoothScroll';

let frames: FrameRequestCallback[] = [];
let clock = 0;
const runFrames = (count = 200, frameMs = 1000 / 60) => {
  for (let i = 0; i < count && frames.length; i += 1) {
    const pending = frames;
    frames = [];
    clock += frameMs;
    pending.forEach((callback) => callback(clock));
  }
};

const setup = (scrollHeight = 20000) => {
  let scrollTop = 0;
  const writes: number[] = [];
  const container = document.createElement('div');
  Object.defineProperty(container, 'clientHeight', { configurable: true, get: () => 800 });
  Object.defineProperty(container, 'scrollHeight', { configurable: true, get: () => scrollHeight });
  Object.defineProperty(container, 'scrollTop', {
    configurable: true,
    get: () => scrollTop,
    set: (value: number) => {
      scrollTop = Math.max(0, Math.min(value, scrollHeight - 800));
      writes.push(scrollTop);
    },
  });
  return { container, writes, scrollTop: () => scrollTop, setScrollTop: (value: number) => { scrollTop = value; } };
};

describe('animateScroll', () => {
  beforeEach(() => {
    frames = [];
    clock = 1000;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('arrives exactly on the target and reports completion', () => {
    const { container, scrollTop } = setup();
    const onEnd = vi.fn();
    animateScroll(container, () => 3000, onEnd);
    runFrames();
    expect(scrollTop()).toBe(3000);
    expect(onEnd).toHaveBeenCalledWith(true);
  });

  it('moves in one direction without overshooting', () => {
    const { container, writes } = setup();
    animateScroll(container, () => 4000);
    runFrames();
    const steps = writes.slice(1).map((value, index) => value - writes[index]);
    expect(steps.every((step) => step >= 0)).toBe(true);
    expect(Math.max(...writes)).toBe(4000);
  });

  it('keeps every frame within a share of the viewport so consecutive frames overlap', () => {
    const { container, writes } = setup();
    animateScroll(container, () => 9000);
    runFrames();
    const steps = writes.slice(1).map((value, index) => value - writes[index]);
    expect(Math.max(...steps)).toBeLessThanOrEqual(800 * 0.45);
  });

  it('cuts only the part beyond the longest glide and glides the rest', () => {
    const { container, writes } = setup(40000);
    animateScroll(container, () => 30000);
    expect(writes[0]).toBeCloseTo(30000 - maxGlideDistance(800));
    runFrames();
    expect(writes[writes.length - 1]).toBe(30000);
  });

  it('does not jump ahead after a long frame', () => {
    const { container, writes } = setup();
    animateScroll(container, () => 5000);
    runFrames(5);
    const before = writes[writes.length - 1];
    runFrames(1, 200);
    const step = writes[writes.length - 1] - before;
    expect(step).toBeLessThanOrEqual(800 * 0.45);
  });

  it('follows a target that moves while it runs', () => {
    const { container, scrollTop } = setup();
    let target = 2000;
    animateScroll(container, () => target);
    runFrames(5);
    target = 2600;
    runFrames();
    expect(scrollTop()).toBe(2600);
  });

  it('stops when the user scrolls', () => {
    const { container, scrollTop } = setup();
    const onEnd = vi.fn();
    animateScroll(container, () => 5000, onEnd);
    runFrames(3);
    const position = scrollTop();
    container.dispatchEvent(new Event('wheel'));
    runFrames();
    expect(scrollTop()).toBe(position);
    expect(onEnd).toHaveBeenCalledWith(false);
  });

  it('stops when the target disappears', () => {
    const { container } = setup();
    const onEnd = vi.fn();
    let present = true;
    animateScroll(container, () => (present ? 3000 : null), onEnd);
    runFrames(2);
    present = false;
    runFrames();
    expect(onEnd).toHaveBeenCalledWith(false);
  });

  it('jumps at once when the user prefers reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const { container, scrollTop } = setup();
    const onEnd = vi.fn();
    animateScroll(container, () => 3000, onEnd);
    expect(scrollTop()).toBe(3000);
    expect(onEnd).toHaveBeenCalledWith(true);
    expect(frames).toHaveLength(0);
  });
});

describe('scroll timing', () => {
  it('takes longer for longer distances within bounds', () => {
    expect(scrollDuration(400, 800)).toBeGreaterThanOrEqual(280);
    expect(scrollDuration(8000, 800)).toBeGreaterThan(scrollDuration(800, 800));
    expect(scrollDuration(100000, 800)).toBe(800);
  });

  it('starts and ends at rest', () => {
    expect(easeInOutSine(0)).toBe(0);
    expect(easeInOutSine(1)).toBe(1);
    expect(easeInOutSine(0.5)).toBeCloseTo(0.5);
  });
});
