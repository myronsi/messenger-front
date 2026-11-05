import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { glideToCenter } from './useHighlightScroll';

let frames: FrameRequestCallback[] = [];
const runFrames = (count = 200) => {
  for (let i = 0; i < count && frames.length; i += 1) {
    const pending = frames;
    frames = [];
    pending.forEach((callback) => callback(0));
  }
};

const setup = () => {
  const layout = { targetTop: 3000, scrollHeight: 6000 };
  let scrollTop = 4000;
  const container = document.createElement('div');
  Object.defineProperty(container, 'clientHeight', { configurable: true, get: () => 500 });
  Object.defineProperty(container, 'scrollTop', {
    configurable: true,
    get: () => scrollTop,
    set: (value: number) => { scrollTop = Math.max(0, Math.min(value, layout.scrollHeight - 500)); },
  });
  container.getBoundingClientRect = () => ({ top: 100 }) as DOMRect;
  const element = document.createElement('div');
  container.appendChild(element);
  document.body.appendChild(container);
  element.getBoundingClientRect = () => ({ top: 100 + layout.targetTop - scrollTop, height: 100 }) as DOMRect;
  const centered = () => layout.targetTop - scrollTop === 200;
  return { container, element, layout, centered, scrollTop: () => scrollTop };
};

describe('glideToCenter', () => {
  beforeEach(() => {
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('centers the message it jumps to', () => {
    const { container, element, centered } = setup();

    glideToCenter(container, element, true);
    runFrames();

    expect(centered()).toBe(true);
  });

  it('still lands on the message when rows above it change height on the way', () => {
    const { container, element, layout, centered } = setup();

    glideToCenter(container, element, true);
    runFrames(3);
    layout.targetTop += 400;
    layout.scrollHeight += 400;
    container.scrollTop += 400;
    runFrames(2);
    layout.targetTop -= 150;
    runFrames();

    expect(centered()).toBe(true);
  });

  it('moves gradually instead of jumping when motion is allowed', () => {
    const { container, element, scrollTop } = setup();

    glideToCenter(container, element, true);
    runFrames(1);

    expect(scrollTop()).toBeGreaterThan(2800);
    expect(scrollTop()).toBeLessThan(4000);
  });

  it('jumps in one frame when the user prefers reduced motion', () => {
    const { container, element, centered } = setup();

    glideToCenter(container, element, false);
    runFrames(1);

    expect(centered()).toBe(true);
  });

  it('lets the user take over by scrolling', () => {
    const { container, element, scrollTop } = setup();

    glideToCenter(container, element, true);
    runFrames(1);
    const position = scrollTop();
    container.dispatchEvent(new Event('wheel'));
    runFrames();

    expect(scrollTop()).toBe(position);
  });
});

describe('useHighlightScroll loading', () => {
  it('loads newer pages for a message newer than the loaded window, older pages otherwise', async () => {
    const { renderHook } = await import('@testing-library/react');
    const { useHighlightScroll } = await import('./useHighlightScroll');
    const loaded = ['100', '101'].map((id) => ({ id, sender: 'a', content: 'x', timestamp: 't', type: 'message' as const, read_by: [] }));
    const onLoadOlderMessages = vi.fn(async () => undefined);
    const onLoadNewerMessages = vi.fn(async () => undefined);
    const run = (targetId: string) => renderHook(() => useHighlightScroll({
      targetId, messages: loaded, messageRefs: { current: {} }, hasMoreMessages: true, isLoadingOlderMessages: false, onLoadOlderMessages,
      hasMoreNewerMessages: true, isLoadingNewerMessages: false, onLoadNewerMessages, behavior: 'auto', chatContainerRef: { current: null },
    }));
    run('500');
    expect(onLoadNewerMessages).toHaveBeenCalledOnce();
    expect(onLoadOlderMessages).not.toHaveBeenCalled();
    run('50');
    expect(onLoadOlderMessages).toHaveBeenCalledOnce();
  });
});
