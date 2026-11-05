import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import ForwardMessageDialog from './ForwardMessageDialog';

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: {} }) }));
vi.mock('@/entities/message', () => ({
  useForwardMessageMutation: () => [vi.fn(), { isLoading: false }],
  useForwardMessagesMutation: () => [vi.fn(), { isLoading: false }],
}));
vi.mock('@/entities/chat', () => ({
  useGetOneOnOneChatsQuery: () => ({ data: { chats: [] } }),
  useGetGroupChatsQuery: () => ({ data: { groups: [] } }),
}));
vi.mock('@/entities/user', () => ({ useGetBlockedUsersQuery: () => ({ data: { users: [] } }) }));

afterEach(() => vi.unstubAllGlobals());

it('focuses the mobile dialog without opening search, but allows tapping to type', async () => {
  vi.stubGlobal('innerWidth', 390);
  render(<ForwardMessageDialog open onOpenChange={vi.fn()} message={null} username="alice" />);
  expect(screen.getByRole('dialog')).toHaveFocus();
  expect(screen.getByRole('textbox')).not.toHaveFocus();
  const user = userEvent.setup();
  await user.click(screen.getByRole('textbox'));
  await user.keyboard('bob');
  expect(screen.getByRole('textbox')).toHaveValue('bob');
});

it('keeps automatic search focus on desktop', async () => {
  vi.stubGlobal('innerWidth', 1024);
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  render(<ForwardMessageDialog open onOpenChange={vi.fn()} message={null} username="alice" />);
  await waitFor(() => expect(screen.getByRole('textbox')).toHaveFocus());
});
