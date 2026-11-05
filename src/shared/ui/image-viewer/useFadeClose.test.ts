import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useFadeClose } from './useFadeClose';

afterEach(() => vi.unstubAllGlobals());

it('fades once, waits before closing, and cancels on unmount', async () => {
  const viewer = document.createElement('div');
  viewer.setAttribute('role', 'dialog');
  const stage = document.createElement('div');
  viewer.append(stage);
  let finish!: () => void;
  const finished = new Promise<void>(resolve => { finish = resolve; });
  const cancel = vi.fn();
  viewer.animate = vi.fn(() => ({ finished, cancel }) as unknown as Animation);
  const onClose = vi.fn();
  const { result, unmount } = renderHook(() => useFadeClose({ current: stage }, onClose));
  act(() => { result.current(); result.current(); });
  expect(viewer.animate).toHaveBeenCalledOnce();
  expect(viewer.animate).toHaveBeenCalledWith([{ opacity: '1' }, { opacity: 0 }], expect.objectContaining({ duration: 100 }));
  expect(onClose).not.toHaveBeenCalled();
  await act(async () => { finish(); await finished; });
  expect(onClose).toHaveBeenCalledOnce();
  unmount();
  expect(cancel).toHaveBeenCalledOnce();
});

it('closes immediately with reduced motion', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const viewer = document.createElement('div');
  viewer.setAttribute('role', 'dialog');
  viewer.animate = vi.fn();
  const stage = document.createElement('div');
  viewer.append(stage);
  const onClose = vi.fn();
  const { result } = renderHook(() => useFadeClose({ current: stage }, onClose));
  act(() => result.current());
  expect(viewer.animate).not.toHaveBeenCalled();
  expect(onClose).toHaveBeenCalledOnce();
});
