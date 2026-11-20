import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import MentionJumpButton from './MentionJumpButton';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en: translations } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations }) };
});
const state = vi.hoisted(() => ({ count: 2, ids: ['11', '12'], load: vi.fn() }));
vi.mock('@/entities/chat', () => ({
  useGetGroupChatsQuery: (_: string, { selectFromResult }: { selectFromResult: (result: unknown) => unknown }) => selectFromResult({
    data: { groups: [{ chat_id: '5', unread_mentions_count: state.count }, { chat_id: '6', unread_mentions_count: 9 }] },
  }),
}));
vi.mock('@/entities/group', () => ({ useLazyGetUnreadMentionsQuery: () => [state.load, { isFetching: false }] }));

beforeEach(() => {
  state.count = 2;
  state.load.mockReset();
  state.load.mockReturnValue({ unwrap: () => Promise.resolve(state.ids) });
});

it('jumps to each unread mention in turn', async () => {
  const onJump = vi.fn();
  render(<MentionJumpButton chatId="5" username="me" onJump={onJump} />);
  const button = screen.getByRole('button', { name: 'Jump to the next mention, 2 unread mentions' });
  expect(button).toHaveTextContent('2');
  fireEvent.click(button);
  await waitFor(() => expect(onJump).toHaveBeenLastCalledWith('11'));
  fireEvent.click(button);
  await waitFor(() => expect(onJump).toHaveBeenLastCalledWith('12'));
  expect(state.load).toHaveBeenCalledWith('5');
});

it('stays hidden without unread mentions', () => {
  state.count = 0;
  render(<MentionJumpButton chatId="5" username="me" onJump={vi.fn()} />);
  expect(screen.queryByTestId('mention-jump')).toBeNull();
});
