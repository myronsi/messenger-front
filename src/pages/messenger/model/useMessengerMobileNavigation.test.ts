import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CurrentChat } from './messengerRoutes';
import { useMessengerMobileNavigation } from './useMessengerMobileNavigation';

const chat: CurrentChat = { id: 7, name: 'alice', interlocutorDeleted: false, type: 'one-on-one' };

const renderNavigation = (isMobile: boolean) => renderHook(
  ({ currentChat }: { currentChat: CurrentChat | null }) => useMessengerMobileNavigation({
    currentChat,
    isMobile,
    navigate: vi.fn(),
    setCurrentChat: vi.fn(),
  }),
  { initialProps: { currentChat: chat as CurrentChat | null } },
);

describe('useMessengerMobileNavigation', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('keeps the closed chat in the mobile panel until the slide-out ends', () => {
    const { result, rerender } = renderNavigation(true);
    expect(result.current.mobilePanelChat).toBe(chat);

    rerender({ currentChat: null });
    expect(result.current.mobilePanelChat).toBe(chat);
    expect(result.current.mobileChatPanelClass).toBe('translate-x-full');

    act(() => vi.advanceTimersByTime(300));
    expect(result.current.mobilePanelChat).toBeNull();
  });

  it('drops the closed chat at once on desktop', () => {
    const { result, rerender } = renderNavigation(false);
    rerender({ currentChat: null });
    expect(result.current.mobilePanelChat).toBeNull();
  });
});
