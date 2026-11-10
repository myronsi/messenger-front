import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RealtimeListener } from '@/shared/api/realtime';
import { useChatListWebSocket } from './useChatListWebSocket';

const mocks = vi.hoisted(() => ({
  listeners: [] as RealtimeListener[],
  status: { direct: 'fulfilled', groups: 'fulfilled', requests: 'fulfilled' },
}));

vi.mock('@/shared/api/realtime', () => ({
  realtime: { subscribe: (listener: RealtimeListener) => { mocks.listeners.push(listener); return () => undefined; } },
}));
vi.mock('@/shared/auth/session', () => ({ endSession: vi.fn() }));
vi.mock('@/shared/lib/notifications/runtime', () => ({ startNotifications: vi.fn(), setNotificationLive: vi.fn() }));
vi.mock('@/shared/lib/notifications/frames', () => ({ notifyMessageFrame: vi.fn() }));
vi.mock('@/entities/typing', () => ({ applyTypingFrame: vi.fn(), clearTypingUsers: vi.fn() }));
vi.mock('@/entities/chat', () => ({
  chatApi: {
    endpoints: {
      getOneOnOneChats: { select: () => () => ({ status: mocks.status.direct }) },
      getGroupChats: { select: () => () => ({ status: mocks.status.groups }) },
      getApprovalRequestInbox: { select: () => () => ({ status: mocks.status.requests }) },
    },
  },
}));
vi.mock('@/shared/hooks/redux', () => ({
  useAppDispatch: () => (thunk: (dispatch: unknown, getState: () => unknown) => unknown) => thunk(undefined, () => ({})),
}));

const setup = () => {
  const refetch = vi.fn();
  const refetchRequestInbox = vi.fn();
  renderHook(() => useChatListWebSocket({
    token: 't', username: 'alice', onChatOpen: vi.fn(), refetch, refetchRequestInbox,
    chatsByIdRef: { current: {} }, setChatOverrides: vi.fn(), setPresenceByUsername: vi.fn(), setModal: vi.fn(),
  }));
  return { refetch, refetchRequestInbox, open: mocks.listeners[mocks.listeners.length - 1] };
};

describe('chat list on socket open', () => {
  beforeEach(() => {
    mocks.listeners.length = 0;
    mocks.status = { direct: 'fulfilled', groups: 'fulfilled', requests: 'fulfilled' };
  });

  it('skips the refetch while the boot prefetch is still in flight', () => {
    mocks.status = { direct: 'pending', groups: 'pending', requests: 'pending' };
    const { refetch, refetchRequestInbox, open } = setup();
    open.onOpen?.({ reconnected: false });
    expect(refetch).not.toHaveBeenCalled();
    expect(refetchRequestInbox).not.toHaveBeenCalled();
  });

  it('refetches when the prefetch finished before the socket opened', () => {
    const { refetch, refetchRequestInbox, open } = setup();
    open.onOpen?.({ reconnected: false });
    expect(refetch).toHaveBeenCalledOnce();
    expect(refetchRequestInbox).toHaveBeenCalledOnce();
  });

  it('decides for chats and requests separately', () => {
    mocks.status = { direct: 'fulfilled', groups: 'fulfilled', requests: 'pending' };
    const { refetch, refetchRequestInbox, open } = setup();
    open.onOpen?.({ reconnected: false });
    expect(refetch).toHaveBeenCalledOnce();
    expect(refetchRequestInbox).not.toHaveBeenCalled();
  });

  it('always refetches after a real reconnect', () => {
    mocks.status = { direct: 'pending', groups: 'pending', requests: 'pending' };
    const { refetch, refetchRequestInbox, open } = setup();
    open.onOpen?.({ reconnected: true });
    expect(refetch).toHaveBeenCalledOnce();
    expect(refetchRequestInbox).toHaveBeenCalledOnce();
  });
});
