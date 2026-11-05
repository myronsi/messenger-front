import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ChatHeaderSearch from './ChatHeaderSearch';

const search = vi.fn();
const highlight = vi.fn();
vi.mock('@/shared/lib/searchHighlight', () => ({ setSearchHighlight: (query: string) => highlight(query) }));
vi.mock('@/shared/contexts/LanguageContext', () => ({
  useLanguage: () => ({ translations: { close: 'Close', olderSearchResult: 'Older match', newerSearchResult: 'Newer match', noSearchResults: 'No results' }, language: 'en' }),
}));
const results = [{ id: '9', sender: 'Bob', content: 'old news', timestamp: 't', type: 'message' }, { id: '4', sender: 'Ann', content: 'very old', timestamp: 't', type: 'message' }];
vi.mock('../api/messageApi', () => ({
  useSearchChatMessagesQuery: (args: { chatId: string; query: string }, options: { skip: boolean }) => {
    search(args, options);
    return { data: options.skip ? undefined : { results: args.query === 'zzz' ? [] : results }, isFetching: false, error: undefined };
  },
}));

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const type = (value: string) => {
  fireEvent.change(screen.getByPlaceholderText('Search in chat'), { target: { value } });
  act(() => { vi.advanceTimersByTime(250); });
};

describe('ChatHeaderSearch', () => {
  it('jumps to the newest match and moves through matches with up and down', () => {
    const onJump = vi.fn();
    render(<ChatHeaderSearch chatId="31" onClose={vi.fn()} onJumpToMessage={onJump} />);
    type('old');
    expect(search).toHaveBeenLastCalledWith({ chatId: '31', query: 'old' }, { skip: false });
    expect(highlight).toHaveBeenLastCalledWith('old');
    expect(onJump).toHaveBeenLastCalledWith('9');
    expect(screen.getByTestId('chat-search-status')).toHaveTextContent('1 / 2');
    expect(screen.getByRole('button', { name: 'Newer match' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Older match' }));
    expect(onJump).toHaveBeenLastCalledWith('4');
    expect(screen.getByTestId('chat-search-status')).toHaveTextContent('2 / 2');
    expect(screen.getByRole('button', { name: 'Older match' })).toBeDisabled();

    fireEvent.keyDown(screen.getByPlaceholderText('Search in chat'), { key: 'Enter', shiftKey: true });
    expect(onJump).toHaveBeenLastCalledWith('9');
  });

  it('says when nothing matches, and closes with the X or Escape', () => {
    const onClose = vi.fn();
    const { unmount } = render(<ChatHeaderSearch chatId="31" onClose={onClose} onJumpToMessage={vi.fn()} />);
    type('zzz');
    expect(screen.getByTestId('chat-search-status')).toHaveTextContent('No results');
    expect(screen.getByTestId('chat-header-search').lastElementChild).toBe(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.keyDown(screen.getByPlaceholderText('Search in chat'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
    unmount();
    expect(highlight).toHaveBeenLastCalledWith('');
  });
});
