import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PREVIEW_HANDOFF_TIMEOUT_MS, usePreviewHandoff } from './usePreviewHandoff';

const setup = () => {
  const clearPreviewMessages = vi.fn();
  const hook = renderHook((props: { isPreview: boolean; isLoadingHistory: boolean; messageCount: number; previewCount: number }) => (
    usePreviewHandoff({ ...props, clearPreviewMessages })
  ), { initialProps: { isPreview: true, isLoadingHistory: false, messageCount: 0, previewCount: 1 } });
  return { ...hook, clearPreviewMessages };
};

describe('usePreviewHandoff', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('keeps the preview bubble while the chat is still being created or its history is loading', () => {
    const { rerender, clearPreviewMessages } = setup();
    rerender({ isPreview: false, isLoadingHistory: false, messageCount: 0, previewCount: 1 });
    rerender({ isPreview: false, isLoadingHistory: true, messageCount: 0, previewCount: 1 });
    expect(clearPreviewMessages).not.toHaveBeenCalled();
  });

  it('removes the preview bubble when the real message arrives', () => {
    const { rerender, clearPreviewMessages } = setup();
    rerender({ isPreview: false, isLoadingHistory: true, messageCount: 0, previewCount: 1 });
    rerender({ isPreview: false, isLoadingHistory: true, messageCount: 1, previewCount: 1 });
    expect(clearPreviewMessages).toHaveBeenCalled();
  });

  it('removes the preview bubble when the history finished loading empty', () => {
    const { rerender, clearPreviewMessages } = setup();
    rerender({ isPreview: false, isLoadingHistory: true, messageCount: 0, previewCount: 1 });
    rerender({ isPreview: false, isLoadingHistory: false, messageCount: 0, previewCount: 1 });
    expect(clearPreviewMessages).toHaveBeenCalledOnce();
  });

  it('never keeps the preview bubble forever', () => {
    vi.useFakeTimers();
    const { rerender, clearPreviewMessages } = setup();
    rerender({ isPreview: false, isLoadingHistory: false, messageCount: 0, previewCount: 1 });
    act(() => { vi.advanceTimersByTime(PREVIEW_HANDOFF_TIMEOUT_MS); });
    expect(clearPreviewMessages).toHaveBeenCalledOnce();
  });

  it('leaves preview messages alone while the chat is still a preview', () => {
    vi.useFakeTimers();
    const { clearPreviewMessages } = setup();
    act(() => { vi.advanceTimersByTime(PREVIEW_HANDOFF_TIMEOUT_MS * 2); });
    expect(clearPreviewMessages).not.toHaveBeenCalled();
  });
});
