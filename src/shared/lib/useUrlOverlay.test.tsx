import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { currentEntryMarks, useUrlOverlay } from './useUrlOverlay';

const wrapper = ({ children }: { children: ReactNode }) => <BrowserRouter>{children}</BrowserRouter>;

beforeEach(() => window.history.replaceState(null, '', '/'));

describe('useUrlOverlay', () => {
  it('gives every opened settings page its own history entry and remembers how it got there', () => {
    const { result } = renderHook(() => useUrlOverlay(), { wrapper });
    const start = window.history.length;

    act(() => result.current.open({ kind: 'settings', page: 'profile' }, { settingsOpened: true, settingsDepth: 0, settingsChain: 0 }));
    act(() => result.current.open({ kind: 'settings', page: 'privacy' }, { settingsDepth: 1, settingsChain: 1 }));
    act(() => result.current.open({ kind: 'settings', page: 'privacy', detail: 'avatar_visibility', exceptions: 'deny' }, { settingsDepth: 3, settingsChain: 2 }));

    expect(window.location.pathname).toBe('/settings/privacy/avatar_visibility/deny');
    expect(window.history.length).toBe(start + 3);
    expect(currentEntryMarks()).toEqual({ settingsOpened: true, settingsDepth: 3, settingsChain: 2 });
  });

  it('keeps the marks when a page is replaced', () => {
    const { result } = renderHook(() => useUrlOverlay(), { wrapper });
    act(() => result.current.open({ kind: 'settings', page: 'personal' }, { settingsDepth: 1, settingsChain: 1 }));
    act(() => result.current.replace({ kind: 'settings', page: 'privacy' }));

    expect(window.location.pathname).toBe('/settings/privacy');
    expect(currentEntryMarks().settingsChain).toBe(1);
  });

  it('reads no marks from an entry the app did not create', () => {
    window.history.replaceState({ usr: 'other' }, '', '/');
    expect(currentEntryMarks()).toEqual({});
  });
});
