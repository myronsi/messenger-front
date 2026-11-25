import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import type { Message, MessagePoll } from '../model/types';
import { MessageChatContext } from '../model/messageChat';
import MessageItem from './MessageItem';

const api = vi.hoisted(() => ({ vote: vi.fn(), voters: vi.fn() }));

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en, language: 'en' }) }));
vi.mock('@/shared/contexts/fileTypesConfig', () => ({ useFileTypes: () => ({ getFileTypeConfig: () => undefined }) }));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: () => <img alt="" /> }));
vi.mock('../api/pollApi', () => ({
  votePoll: (...args: unknown[]) => api.vote(...args),
  closePoll: vi.fn(),
  fetchPollVoters: (...args: unknown[]) => api.voters(...args),
  pollErrorCode: () => undefined,
}));

const poll = (extra: Partial<MessagePoll> = {}): MessagePoll => ({
  question: 'Lunch?', options: [{ text: 'Pizza', voter_count: null }, { text: 'Soup', voter_count: null }], multiple_answers: false,
  anonymous: true, quiz: false, explanation: null, close_at: null, closed_at: null, total_voters: null, my_votes: [], can_close: false, version: 1, ...extra,
});

const message = (value: MessagePoll, senderId = '2'): Message => ({
  id: '30', sender: 'Anna', sender_id: senderId, content: '📊 Lunch?', timestamp: '2026-11-25T10:00:00Z', type: 'message', read_by: [], poll: value,
});

const item = (value: Message) => (
  <MessageChatContext.Provider value="5">
    <MessageItem
      message={value} prevMessage={null} nextMessage={null} userId="1" isGroup isImage={false} isMobile={false}
      showNewMessagesMarker={false} nextShowsNewMessagesMarker={false} translations={en} interlocutorDeleted={false} isHighlighted={false}
      isContextHighlighted={false} messageRefs={{ current: {} }} firstUnreadMarkerRef={{ current: null }} getFormattedDateLabel={() => 'Today'}
      getMessageTime={() => '10:00'} isOwnMessage={(entry) => entry.sender_id === '1'} getFileTypeConfig={() => undefined}
      renderMessageContent={(entry) => entry.content as string} onPlayAudio={vi.fn()} onMessageClick={vi.fn()}
      onClick={vi.fn()} onAvatarClick={vi.fn()} onReplyClick={vi.fn()} setTempHighlightedMessageId={vi.fn()} wsRef={{ current: null }}
    />
  </MessageChatContext.Provider>
);

beforeEach(() => { api.vote.mockReset(); api.voters.mockReset(); });
afterEach(() => vi.useRealTimers());

describe('MessageItem poll', () => {
  it('lets a member vote with one tap and shows the kind of poll', async () => {
    const updated = poll({ my_votes: [1], total_voters: 1, options: [{ text: 'Pizza', voter_count: 0 }, { text: 'Soup', voter_count: 1 }], version: 2 });
    api.vote.mockResolvedValue(updated);
    const listener = vi.fn();
    window.addEventListener('messenger:poll-updated', listener);
    render(item(message(poll())));
    expect(screen.getByText('Anonymous poll')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    await act(async () => { fireEvent.click(screen.getByRole('radio', { name: 'Soup' })); });
    expect(api.vote).toHaveBeenCalledWith('5', '30', [1]);
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ chatId: '5', messageId: '30', poll: updated });
    window.removeEventListener('messenger:poll-updated', listener);
  });

  it('shows result bars, percentages and the voter count after voting', () => {
    render(item(message(poll({
      my_votes: [0], total_voters: 4, options: [{ text: 'Pizza', voter_count: 3 }, { text: 'Soup', voter_count: 1 }],
    }))));
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByTestId('poll-footer')).toHaveTextContent('4 votes');
  });

  it('collects several answers before voting when the poll allows it', async () => {
    api.vote.mockResolvedValue(poll({ version: 2 }));
    render(item(message(poll({ multiple_answers: true }))));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pizza' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Soup' }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Vote' })); });
    expect(api.vote).toHaveBeenCalledWith('5', '30', [0, 1]);
  });

  it('marks the right and the wrong answer of a quiz and shows the explanation', () => {
    render(item(message(poll({
      quiz: true, my_votes: [1], total_voters: 2, explanation: 'It is Friday.',
      options: [{ text: 'Pizza', voter_count: 1, is_correct: true }, { text: 'Soup', voter_count: 1, is_correct: false }],
    }))));
    expect(screen.getByText('Anonymous quiz')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pizza, Correct answer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Soup, Wrong answer' })).toBeInTheDocument();
    expect(screen.getByText('It is Friday.')).toBeInTheDocument();
  });

  it('counts down to the closing time and shows Closed once it has passed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-25T10:00:00Z'));
    render(item(message(poll({ close_at: '2026-11-25T10:00:05Z' }))));
    expect(screen.getByTestId('poll-footer')).toHaveTextContent('Closes in 0:05');
    for (let second = 0; second < 6; second += 1) act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByTestId('poll-footer')).toHaveTextContent('Closed');
    expect(screen.getAllByTestId('poll-option')[0]).toBeDisabled();
  });

  it('opens who voted for an option of a public poll', async () => {
    api.voters.mockResolvedValue({ items: [{ id: '3', username: 'ben', display_name: 'Ben' }], next_cursor: null });
    render(item(message(poll({
      anonymous: false, my_votes: [0], total_voters: 1, options: [{ text: 'Pizza', voter_count: 1 }, { text: 'Soup', voter_count: 0 }],
    }))));
    expect(screen.getByText('Public poll')).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getAllByTestId('poll-option')[0]); });
    expect(api.voters).toHaveBeenCalledWith('5', '30', 0, null);
    expect(within(screen.getByTestId('poll-voters')).getByText('Ben')).toBeInTheDocument();
    expect(screen.getAllByTestId('poll-option')[1]).toBeDisabled();
  });
});
