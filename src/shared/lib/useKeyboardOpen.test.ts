import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const viewport = Object.assign(new EventTarget(), { width: 375, height: 812, scale: 1, offsetTop: 0 });

const resize = (height: number) => act(() => {
  viewport.height = height;
  viewport.dispatchEvent(new Event('resize'));
});

beforeEach(() => {
  vi.resetModules();
  viewport.height = 812;
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
});
afterEach(() => {
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined });
});

describe('keyboard open', () => {
  it('turns on while the keyboard takes the bottom of the screen and off when it closes', async () => {
    const { useKeyboardOpen } = await import('./useKeyboardOpen');
    const { result } = renderHook(() => useKeyboardOpen());
    expect(result.current).toBe(false);
    resize(480);
    expect(result.current).toBe(true);
    resize(780);
    expect(result.current).toBe(false);
  });

  it('stays off when it is not enabled', async () => {
    const { useKeyboardOpen } = await import('./useKeyboardOpen');
    const { result } = renderHook(() => useKeyboardOpen(false));
    resize(480);
    expect(result.current).toBe(false);
  });
});
