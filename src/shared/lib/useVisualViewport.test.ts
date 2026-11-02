import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useVisualViewport } from './useVisualViewport';

const fakeViewport = () => {
  const listeners: Record<string, () => void> = {};
  const viewport = {
    height: 800, offsetTop: 0, scale: 1,
    addEventListener: vi.fn((type: string, listener: () => void) => { listeners[type] = listener; }),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal('visualViewport', viewport);
  return { viewport, fire: (type: string) => listeners[type]() };
};

const vars = () => [
  document.documentElement.style.getPropertyValue('--visual-viewport-height'),
  document.documentElement.style.getPropertyValue('--visual-viewport-top'),
];

describe('useVisualViewport', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('follows the area left above the on-screen keyboard', () => {
    const { viewport, fire } = fakeViewport();
    renderHook(() => useVisualViewport(true));
    expect(vars()).toEqual(['800px', '0px']);
    Object.assign(viewport, { height: 460, offsetTop: 120 });
    fire('resize');
    expect(vars()).toEqual(['460px', '120px']);
  });

  it('ignores pinch zoom and clears its values when switched off', () => {
    const { viewport, fire } = fakeViewport();
    const { rerender } = renderHook(({ enabled }) => useVisualViewport(enabled), { initialProps: { enabled: true } });
    Object.assign(viewport, { height: 300, scale: 2 });
    fire('resize');
    expect(vars()).toEqual(['800px', '0px']);
    rerender({ enabled: false });
    expect(vars()).toEqual(['', '']);
  });
});
