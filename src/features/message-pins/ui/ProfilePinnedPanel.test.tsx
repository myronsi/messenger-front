import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import type { PinnedMessage } from '@/entities/message';
import { ProfilePinnedPanel } from './ProfilePinnedPanel';

const state = vi.hoisted(() => ({
  query: { data: undefined as unknown, isLoading: false, isError: false, refetch: vi.fn() },
  loadMore: vi.fn(),
}));

vi.mock('@/entities/message', () => ({
  useGetPinnedMessagesQuery: () => state.query,
  useLoadMorePinnedMessagesMutation: () => [state.loadMore, { isLoading: false }],
  richLabel: () => null,
}));
vi.mock('../model/usePinnedMessages', () => ({ pinsEnabled: () => true }));
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en, language: 'en' }) }));
vi.mock('@/shared/ui/CustomEmoji', () => ({ EmojiText: ({ text }: { text: string }) => <>{text}</> }));

const pin = (id: string, content: string, scope: PinnedMessage['scope'] = 'everyone'): PinnedMessage => ({
  message: { id, sender: 'Anna', content, timestamp: '2026-11-20T10:00:00Z', type: 'message', read_by: [] },
  scope, pinned_by: '2', pinned_at: '2026-11-21T10:00:00Z', can_unpin_for_everyone: true,
});

beforeEach(() => {
  state.query = { data: undefined, isLoading: false, isError: false, refetch: vi.fn() };
  state.loadMore.mockReset();
});

describe('ProfilePinnedPanel', () => {
  it('lists the pinned messages and jumps to the one tapped', () => {
    state.query.data = { items: [pin('10', 'Meeting at 5'), pin('11', 'Only mine', 'me')], next_cursor: null, count: 2 };
    const onJump = vi.fn();
    render(<ProfilePinnedPanel chatId="5" onJumpToMessage={onJump} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByLabelText(en.messagePins.onlyForYou)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Meeting at 5'));
    expect(onJump).toHaveBeenCalledWith('10');
  });

  it('loads the next page when there is more', () => {
    state.query.data = { items: [pin('10', 'First')], next_cursor: 'c1', count: null };
    render(<ProfilePinnedPanel chatId="5" />);
    fireEvent.click(screen.getByRole('button', { name: en.messagePins.loadMore }));
    expect(state.loadMore).toHaveBeenCalledWith({ chatId: '5', after: 'c1' });
  });

  it('offers a retry when loading fails', () => {
    state.query.isError = true;
    render(<ProfilePinnedPanel chatId="5" />);
    fireEvent.click(screen.getByRole('button', { name: en.messagePins.loadFailed }));
    expect(state.query.refetch).toHaveBeenCalledTimes(1);
  });
});
