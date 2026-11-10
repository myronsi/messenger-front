import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reportClientOutdated, resetUpdateStatusForTests } from '@/shared/api/updateGate';
import { clearAuthTokens, dropInvalidSession } from '@/shared/auth/session';
import { draftId, readDraft } from '@/shared/lib/drafts';
import { DRAFT_WRITE_DELAY_MS, useDraftState } from './useDraftState';

const signIn = (sub: string) => localStorage.setItem('access_token', `h.${btoa(JSON.stringify({ sub }))}.s`);

describe('useDraftState', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    resetUpdateStatusForTests();
    signIn('1');
  });

  afterEach(() => vi.useRealTimers());

  it('persists the text per chat and restores it after a reload', () => {
    vi.useFakeTimers();
    const first = renderHook(() => useDraftState('chat:5'));
    act(() => first.result.current[1]('unsent'));
    act(() => { vi.advanceTimersByTime(DRAFT_WRITE_DELAY_MS); });
    expect(readDraft(draftId('1', 'chat:5'))).toBe('unsent');
    first.unmount();

    const afterReload = renderHook(() => useDraftState('chat:5'));
    expect(afterReload.result.current[0]).toBe('unsent');
  });

  it('writes the draft once typing pauses and flushes a pending write on unmount', () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() => useDraftState('chat:5'));
    act(() => result.current[1]('h'));
    act(() => result.current[1]('he'));
    act(() => { vi.advanceTimersByTime(DRAFT_WRITE_DELAY_MS - 1); });
    expect(readDraft(draftId('1', 'chat:5'))).toBe('');
    act(() => { vi.advanceTimersByTime(1); });
    expect(readDraft(draftId('1', 'chat:5'))).toBe('he');

    act(() => result.current[1]('hello'));
    unmount();
    expect(readDraft(draftId('1', 'chat:5'))).toBe('hello');
  });

  it('does not bring a pending draft back after the tokens are cleared', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDraftState('chat:5'));
    act(() => result.current[1]('private'));
    act(() => { clearAuthTokens(); vi.advanceTimersByTime(DRAFT_WRITE_DELAY_MS); });
    expect(sessionStorage.length).toBe(0);
  });

  it('removes the draft when the input is cleared, for example after sending', () => {
    const { result } = renderHook(() => useDraftState('chat:5'));
    act(() => result.current[1]('unsent'));
    act(() => result.current[1](''));
    expect(sessionStorage.length).toBe(0);
  });

  it('keeps drafts of different chats apart and follows chat changes', () => {
    sessionStorage.setItem('draft:1:chat:6', 'other chat');
    const { result, rerender } = renderHook(({ key }) => useDraftState(key), { initialProps: { key: 'chat:5' } });
    act(() => result.current[1]('first chat'));

    rerender({ key: 'chat:6' });
    expect(result.current[0]).toBe('other chat');
    rerender({ key: 'chat:5' });
    expect(result.current[0]).toBe('first chat');
  });

  it('supports functional updates and does not persist conversations without a key', () => {
    const { result } = renderHook(() => useDraftState(null));
    act(() => result.current[1]('a'));
    act(() => result.current[1]((previous) => `${previous}b`));
    expect(result.current[0]).toBe('ab');
    expect(sessionStorage.length).toBe(0);
  });

  it('does not persist text while persistence is off, and keeps the earlier draft', () => {
    const { result, rerender } = renderHook(({ persist }) => useDraftState('chat:5', persist), { initialProps: { persist: true } });
    act(() => result.current[1]('draft'));
    rerender({ persist: false });
    act(() => result.current[1]('text of an edited message'));
    expect(readDraft(draftId('1', 'chat:5'))).toBe('draft');

    act(() => result.current[1](''));
    rerender({ persist: true });
    expect(sessionStorage.length).toBe(0);
  });

  it('never shows or stores a draft of another account', () => {
    const { result } = renderHook(() => useDraftState('chat:5'));
    act(() => result.current[1]('private'));

    act(() => { signIn('2'); window.dispatchEvent(new StorageEvent('storage', { key: 'access_token', newValue: localStorage.getItem('access_token') })); });
    expect(result.current[0]).toBe('');
    expect(readDraft(draftId('2', 'chat:5'))).toBe('');
  });

  it('removes the stored draft synchronously when it is cleared, even if the component unmounts at once', () => {
    const { result, unmount } = renderHook(() => useDraftState('chat:5'));
    act(() => result.current[1]('first message'));
    act(() => { result.current[1](''); unmount(); });
    expect(sessionStorage.length).toBe(0);
  });

  it('keeps tokens and drafts when the server reported an outdated client', () => {
    sessionStorage.setItem('draft:1:chat:5', 'unsent');
    reportClientOutdated();
    dropInvalidSession();
    expect(localStorage.getItem('access_token')).not.toBeNull();
    expect(sessionStorage.getItem('draft:1:chat:5')).toBe('unsent');

    resetUpdateStatusForTests();
    dropInvalidSession();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(sessionStorage.getItem('draft:1:chat:5')).toBeNull();
  });

  it('is cleared when the tokens are cleared, in this tab or another one', () => {
    sessionStorage.setItem('draft:1:chat:5', 'secret');
    sessionStorage.setItem('unrelated', 'keep');
    clearAuthTokens();
    expect(sessionStorage.getItem('draft:1:chat:5')).toBeNull();
    expect(sessionStorage.getItem('unrelated')).toBe('keep');

    sessionStorage.setItem('draft:1:chat:5', 'secret');
    window.dispatchEvent(new StorageEvent('storage', { key: 'access_token', newValue: null }));
    expect(sessionStorage.getItem('draft:1:chat:5')).toBeNull();
  });
});