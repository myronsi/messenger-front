import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearDrafts, readDraft } from '@/shared/lib/drafts';
import { useDraftState } from './useDraftState';

describe('useDraftState', () => {
  beforeEach(() => { sessionStorage.clear(); });

  it('persists the text per chat and restores it after a reload', () => {
    const first = renderHook(() => useDraftState(5));
    act(() => first.result.current[1]('unsent'));
    expect(readDraft(5)).toBe('unsent');
    first.unmount();

    const afterReload = renderHook(() => useDraftState(5));
    expect(afterReload.result.current[0]).toBe('unsent');
  });

  it('removes the draft when the input is cleared, for example after sending', () => {
    const { result } = renderHook(() => useDraftState(5));
    act(() => result.current[1]('unsent'));
    act(() => result.current[1](''));
    expect(sessionStorage.length).toBe(0);
  });

  it('keeps drafts of different chats apart and follows chat changes', () => {
    sessionStorage.setItem('draft:6', 'other chat');
    const { result, rerender } = renderHook(({ chatId }) => useDraftState(chatId), { initialProps: { chatId: 5 } });
    act(() => result.current[1]('first chat'));

    rerender({ chatId: 6 });
    expect(result.current[0]).toBe('other chat');
    rerender({ chatId: 5 });
    expect(result.current[0]).toBe('first chat');
  });

  it('supports functional updates and does not persist previews (chat id 0)', () => {
    const { result } = renderHook(() => useDraftState(0));
    act(() => result.current[1]('a'));
    act(() => result.current[1]((previous) => `${previous}b`));
    expect(result.current[0]).toBe('ab');
    expect(sessionStorage.length).toBe(0);
  });

  it('is cleared when the session ends', () => {
    sessionStorage.setItem('draft:5', 'secret');
    sessionStorage.setItem('unrelated', 'keep');
    clearDrafts();
    expect(sessionStorage.getItem('draft:5')).toBeNull();
    expect(sessionStorage.getItem('unrelated')).toBe('keep');
  });
});