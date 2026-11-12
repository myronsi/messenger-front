import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ChatHeaderSearch from './ChatHeaderSearch';

const search = vi.fn();
const highlight = vi.fn();
vi.mock('@/shared/lib/searchHighlight', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/shared/lib/searchHighlight')>(), setSearchHighlight: (query: string) => highlight(query),
}));
vi.mock('@/shared/hooks/use-mobile', () => ({ useIsMobile: () => mobile.value }));
const mobile = vi.hoisted(() => ({ value: false }));
vi.mock('@/shared/contexts/LanguageContext', () => ({
  useLanguage: () => ({ translations: { close: 'Close', olderSearchResult: 'Older match', newerSearchResult: 'Newer match', noSearchResults: 'No results', searchResultsList: 'Results list' }, language: 'en' }),
}));
const results = [
  { id: '9', sender: 'Bob', content: 'old news', timestamp: '2026-11-10T09:30:00Z', type: 'message' },
  { id: '4', sender: 'Ann', content: 'very old', timestamp: '2026-11-09T08:00:00Z', type: 'message' },
];
const served = { results };
vi.mock('../api/messageApi', () => ({
  useSearchChatMessagesQuery: (args: { chatId: string; query: string }, options: { skip: boolean }) => {
    search(args, options);
    return { currentData: options.skip ? undefined : { results: args.query === 'zzz' ? [] : served.results }, isFetching: false, error: undefined };
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

  it('goes back to the first match when refreshed results bring a newer one', () => {
    const onJump = vi.fn();
    const view = render(<ChatHeaderSearch chatId="31" onClose={vi.fn()} onJumpToMessage={onJump} />);
    type('old');
    fireEvent.click(screen.getByRole('button', { name: 'Older match' }));
    expect(screen.getByTestId('chat-search-status')).toHaveTextContent('2 / 2');
    served.results = [{ id: '11', sender: 'Cy', content: 'old again', timestamp: 't', type: 'message' }, ...results];
    view.rerender(<ChatHeaderSearch chatId="31" onClose={vi.fn()} onJumpToMessage={onJump} />);
    expect(onJump).toHaveBeenLastCalledWith('11');
    expect(screen.getByTestId('chat-search-status')).toHaveTextContent('1 / 3');
    served.results = results;
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

  it('lists the matches with sender and the match marked, and jumps to a picked row', () => {
    const onJump = vi.fn();
    render(<ChatHeaderSearch chatId="31" onClose={vi.fn()} onJumpToMessage={onJump} />);
    type('old');
    fireEvent.click(screen.getByRole('button', { name: 'Results list' }));
    const list = screen.getByTestId('chat-search-results');
    expect(list).toHaveTextContent('Bob');
    expect(list).toHaveTextContent('Ann');
    expect(list.querySelectorAll('mark[data-search-match]')).toHaveLength(2);
    fireEvent.click(screen.getByText('Ann'));
    expect(onJump).toHaveBeenLastCalledWith('4');
    expect(screen.getByTestId('chat-search-status')).toHaveTextContent('2 / 2');
    expect(screen.getByTestId('chat-search-results')).toBeInTheDocument();
  });

  it('closes the list first on Escape, then the search', () => {
    const onClose = vi.fn();
    render(<ChatHeaderSearch chatId="31" onClose={onClose} onJumpToMessage={vi.fn()} />);
    type('old');
    fireEvent.click(screen.getByRole('button', { name: 'Results list' }));
    fireEvent.keyDown(screen.getByPlaceholderText('Search in chat'), { key: 'Escape' });
    expect(screen.queryByTestId('chat-search-results')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByPlaceholderText('Search in chat'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('hides the list after picking a match on a phone', () => {
    mobile.value = true;
    render(<ChatHeaderSearch chatId="31" onClose={vi.fn()} onJumpToMessage={vi.fn()} />);
    type('old');
    fireEvent.click(screen.getByRole('button', { name: 'Results list' }));
    fireEvent.click(screen.getByText('Ann'));
    expect(screen.queryByTestId('chat-search-results')).not.toBeInTheDocument();
    mobile.value = false;
  });
});
