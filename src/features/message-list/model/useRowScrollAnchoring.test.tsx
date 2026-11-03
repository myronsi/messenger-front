import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '@/entities/message';
import { useRowScrollAnchoring } from './useRowScrollAnchoring';

type Entry = { target: Element; contentRect: { height: number } };
let report: (entries: Entry[]) => void = () => undefined;

const row = (top: number) => {
  const element = document.createElement('div');
  element.getBoundingClientRect = () => ({ top }) as DOMRect;
  return element as HTMLDivElement;
};

const setup = (stick = false) => {
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: (entries: Entry[]) => void) { report = callback; }
    observe() {}
    disconnect() {}
  });
  const container = document.createElement('div');
  container.getBoundingClientRect = () => ({ top: 100 }) as DOMRect;
  container.scrollTop = 500;
  const above = row(20);
  const below = row(300);
  renderHook(() => useRowScrollAnchoring({
    chatContainerRef: { current: container },
    messageRefs: { current: { a: above, b: below } },
    messages: [] as Message[],
    shouldStickToBottomRef: { current: stick },
    isRestoringScrollRef: { current: false },
  }));
  report([{ target: above, contentRect: { height: 72 } }, { target: below, contentRect: { height: 72 } }]);
  return { container, above, below };
};

describe('useRowScrollAnchoring', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps the visible messages still when a row above them changes height', () => {
    const { container, above, below } = setup();
    report([{ target: above, contentRect: { height: 42 } }]);
    expect(container.scrollTop).toBe(470);
    report([{ target: below, contentRect: { height: 200 } }]);
    expect(container.scrollTop).toBe(470);
  });

  it('leaves the position to the bottom logic while the chat sticks to the bottom', () => {
    const { container, above } = setup(true);
    report([{ target: above, contentRect: { height: 42 } }]);
    expect(container.scrollTop).toBe(500);
  });
});
