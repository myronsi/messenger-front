import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useSwipeDismiss } from './useSwipeDismiss';

it('finishes the downward slide and backdrop fade before closing', async () => {
  const backdrop = document.createElement('div');
  backdrop.setAttribute('role', 'dialog');
  const stage = document.createElement('div');
  const image = document.createElement('img');
  image.setAttribute('data-active-slide', '');
  backdrop.append(stage);
  stage.append(image);
  let finish!: () => void;
  const finished = new Promise<void>(resolve => { finish = resolve; });
  const animation = { finished, cancel: vi.fn() } as unknown as Animation;
  stage.animate = vi.fn();
  image.animate = vi.fn(() => animation);
  backdrop.animate = vi.fn(() => animation);
  const onClose = vi.fn();
  const { result } = renderHook(() => useSwipeDismiss({ current: stage }, onClose));
  act(() => result.current(150));
  expect(image.animate).toHaveBeenCalledWith([
    { transform: 'translateY(150px)' }, { transform: `translateY(${window.innerHeight}px) scale(0.6)` },
  ], expect.objectContaining({ duration: 320 }));
  expect(backdrop.animate).toHaveBeenCalledWith([{ opacity: 1 }, { opacity: 0 }], expect.anything());
  expect(onClose).not.toHaveBeenCalled();
  await act(async () => { finish(); await finished; });
  expect(onClose).toHaveBeenCalledOnce();
});
