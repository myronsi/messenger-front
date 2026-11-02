import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import { muteNotifications } from '@/shared/lib/notifications/api';
import ChatMuteAction from './ChatMuteAction';
import ChatMuteMenuItems from './ChatMuteMenuItems';

let snapshot = { preferences: { enabled: true, sound: true, previews: false }, mutes: [] as { chat_id: string; until: string }[] };
const setMutes = (mutes: { chat_id: string; until: string }[]) => { snapshot = { ...snapshot, mutes }; };
vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations }) };
});
vi.mock('@/shared/lib/notifications/api', () => ({
  subscribeNotifications: () => () => undefined,
  notificationSnapshot: () => snapshot,
  muteNotifications: vi.fn(async () => undefined),
}));

describe('chat mute controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMutes([]);
  });

  it('mutes from the chat-list menu after picking a duration', async () => {
    const onDone = vi.fn();
    render(<ChatMuteMenuItems chatId="7" onDone={onDone} onError={vi.fn()} />);
    expect(screen.queryByText(en.muteFor8Hours)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(en.muteChat));
    fireEvent.click(screen.getByText(en.muteFor8Hours));
    await waitFor(() => expect(muteNotifications).toHaveBeenCalledWith('7', '8h'));
    expect(onDone).toHaveBeenCalled();
  });

  it('shows the durations as their own step with a way back', () => {
    render(<ChatMuteMenuItems chatId="7" onDone={vi.fn()} onError={vi.fn()} />);
    fireEvent.click(screen.getByText(en.muteChat));
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([en.muteChat, en.muteFor1Hour, en.muteFor8Hours, en.muteForever]);
    fireEvent.click(screen.getByText(en.muteChat));
    expect(screen.queryByText(en.muteFor1Hour)).not.toBeInTheDocument();
  });

  it('offers unmute with the end time for a muted chat', async () => {
    setMutes([{ chat_id: '7', until: '9999-01-01T00:00:00Z' }]);
    render(<ChatMuteMenuItems chatId="7" onDone={vi.fn()} onError={vi.fn()} />);
    expect(screen.getByText(en.mutedForever)).toBeInTheDocument();
    fireEvent.click(screen.getByText(en.unmuteChat));
    await waitFor(() => expect(muteNotifications).toHaveBeenCalledWith('7', 'off'));
  });

  it('reports a failed change instead of closing the menu', async () => {
    vi.mocked(muteNotifications).mockRejectedValueOnce(new Error('offline'));
    const onDone = vi.fn();
    const onError = vi.fn();
    render(<ChatMuteMenuItems chatId="7" onDone={onDone} onError={onError} />);
    fireEvent.click(screen.getByText(en.muteChat));
    fireEvent.click(screen.getByText(en.muteFor1Hour));
    await waitFor(() => expect(onError).toHaveBeenCalledWith(en.muteChatFailed));
    expect(onDone).not.toHaveBeenCalled();
  });

  it('unmutes straight from the chat profile button', async () => {
    setMutes([{ chat_id: '7', until: '9999-01-01T00:00:00Z' }]);
    render(<ChatMuteAction chatId="7" className="" />);
    fireEvent.click(screen.getByRole('button', { name: en.unmuteChat }));
    await waitFor(() => expect(muteNotifications).toHaveBeenCalledWith('7', 'off'));
  });
});
