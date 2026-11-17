import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { useLocation } from 'react-router-dom';
import { useMessengerRouteSync } from './useMessengerRouteSync';

const mocks = vi.hoisted(() => ({ loadChats: vi.fn(), authFetch: vi.fn() }));

vi.mock('@/shared/hooks/redux', () => ({ useAppDispatch: () => () => ({ unwrap: mocks.loadChats }) }));
vi.mock('@/entities/chat', () => ({ chatApi: { endpoints: { getOneOnOneChats: { initiate: () => ({}) } } } }));
vi.mock('@/shared/auth/session', () => ({ authFetch: mocks.authFetch }));
vi.mock('@/shared/lib/notifications/openChat', () => ({ routeNotificationChats: () => () => undefined }));
vi.mock('./resolveNotificationChat', () => ({ resolveNotificationChat: vi.fn() }));
vi.mock('@/shared/lib/notifications/replyFocus', () => ({ focusComposerWhenReady: vi.fn() }));

type Location = ReturnType<typeof useLocation>;
const location = (pathname: string, state: unknown): Location => ({ pathname, search: '', hash: '', state, key: 'k' } as Location);
const clickState = { chatId: '42', chatName: 'anna', chatDisplayName: 'Anna', type: 'one-on-one' };

const setOnline = (online: boolean) => vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online);

const run = (pathname: string, state: unknown) => {
  const setCurrentChat = vi.fn();
  renderHook(() => useMessengerRouteSync({ currentChat: null, location: location(pathname, state), navigate: vi.fn(), username: 'myron', setCurrentChat }));
  return setCurrentChat;
};

describe('useMessengerRouteSync direct chats', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.loadChats.mockRejectedValue(new TypeError('Failed to fetch'));
    mocks.authFetch.mockRejectedValue(new TypeError('Failed to fetch'));
  });
  afterEach(() => vi.restoreAllMocks());

  it('keeps a chat opened from the list when the chat lookup fails offline', async () => {
    setOnline(false);
    const setCurrentChat = run('/dm/@anna', clickState);
    await waitFor(() => expect(mocks.loadChats).toHaveBeenCalled());
    await Promise.resolve();
    expect(setCurrentChat).toHaveBeenCalledTimes(1);
    expect(setCurrentChat).not.toHaveBeenCalledWith(null);
  });

  it('keeps a chat opened from a profile when the user lookup fails offline', async () => {
    setOnline(false);
    const setCurrentChat = run('/dm/@anna', { chatDisplayName: 'Anna' });
    await waitFor(() => expect(mocks.authFetch).toHaveBeenCalled());
    await Promise.resolve();
    expect(setCurrentChat).not.toHaveBeenCalledWith(null);
  });

  it('still closes the chat when the lookup fails while online', async () => {
    setOnline(true);
    const setCurrentChat = run('/dm/@anna', clickState);
    await waitFor(() => expect(setCurrentChat).toHaveBeenCalledWith(null));
  });
});
