import { describe, expect, it, vi } from 'vitest';
import { prefetchPages } from './prefetchPages';

const box = (scrollTop: number) => {
  const container = document.createElement('div');
  Object.defineProperty(container, 'clientHeight', { value: 800 });
  Object.defineProperty(container, 'scrollHeight', { value: 20000 });
  container.scrollTop = scrollTop;
  Object.defineProperty(container, 'scrollTop', { value: scrollTop });
  return container;
};

const paging = () => ({
  hasMoreMessages: true, isLoadingOlderMessages: false, onLoadOlderMessages: vi.fn(async () => undefined),
  hasMoreNewerMessages: true, isLoadingNewerMessages: false, onLoadNewerMessages: vi.fn(async () => undefined),
});

describe('prefetchPages', () => {
  it('loads the older page two screens before the top so the reader never hits the end', () => {
    const state = paging();
    prefetchPages(box(1500), state);
    expect(state.onLoadOlderMessages).toHaveBeenCalledOnce();
    expect(state.onLoadNewerMessages).not.toHaveBeenCalled();
  });

  it('loads the newer page two screens before the bottom', () => {
    const state = paging();
    prefetchPages(box(20000 - 800 - 1500), state);
    expect(state.onLoadNewerMessages).toHaveBeenCalledOnce();
    expect(state.onLoadOlderMessages).not.toHaveBeenCalled();
  });

  it('waits while a page is loading or when there is nothing more', () => {
    const state = { ...paging(), isLoadingOlderMessages: true, hasMoreNewerMessages: false };
    prefetchPages(box(0), state);
    prefetchPages(box(19200), state);
    expect(state.onLoadOlderMessages).not.toHaveBeenCalled();
    expect(state.onLoadNewerMessages).not.toHaveBeenCalled();
  });
});
