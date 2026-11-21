import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCloseSearchWhenHidden } from './useChatSearchOverlay';

describe('useCloseSearchWhenHidden', () => {
  it('closes an open search once when the chat list is hidden', () => {
    const close = vi.fn();
    const { rerender } = renderHook(({ hidden, visible }) => useCloseSearchWhenHidden(hidden, visible, close), {
      initialProps: { hidden: false, visible: true },
    });
    expect(close).not.toHaveBeenCalled();
    rerender({ hidden: true, visible: true });
    rerender({ hidden: true, visible: true });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the search is already closed', () => {
    const close = vi.fn();
    const { rerender } = renderHook(({ hidden }) => useCloseSearchWhenHidden(hidden, false, close), { initialProps: { hidden: false } });
    rerender({ hidden: true });
    expect(close).not.toHaveBeenCalled();
  });
});
