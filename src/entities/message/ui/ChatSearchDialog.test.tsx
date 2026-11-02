import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChatSearchDialog from './ChatSearchDialog';

const search = vi.fn();
vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: {}, language: 'en' }) }));
vi.mock('../api/messageApi', () => ({
  useSearchChatMessagesQuery: (args: { chatId: string; query: string }, options: { skip: boolean }) => {
    search(args, options);
    return options.skip
      ? { data: undefined, isFetching: false, error: undefined }
      : { data: { results: [{ id: '42', sender: 'Alice', content: 'an old message', timestamp: '2026-10-01T10:00:00Z', type: 'message' }] }, isFetching: false, error: undefined };
  },
}));

describe('ChatSearchDialog', () => {
  it('searches the whole chat on the server and jumps to a result', () => {
    const onOpenChange = vi.fn();
    const onJumpToMessage = vi.fn();
    render(<ChatSearchDialog open onOpenChange={onOpenChange} chatId="31" onJumpToMessage={onJumpToMessage} />);
    fireEvent.change(screen.getByPlaceholderText('Search in chat'), { target: { value: 'old' } });
    expect(search).toHaveBeenLastCalledWith({ chatId: '31', query: 'old' }, { skip: false });
    fireEvent.click(screen.getByText('an old message'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onJumpToMessage).toHaveBeenCalledWith('42');
  });
});
