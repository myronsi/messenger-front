import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Message } from '@/entities/message';
import { en } from '@/shared/lang/en';
import ForwardMessageDialog from './ForwardMessageDialog';

const api = vi.hoisted(() => ({ forwardOne: vi.fn(), forwardMany: vi.fn(), toast: vi.fn() }));

vi.mock('@/shared/contexts/LanguageContext', () => ({ useLanguage: () => ({ translations: en, language: 'en' }) }));
vi.mock('@/entities/message', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/entities/message')>()),
  useForwardMessageMutation: () => [api.forwardOne, { isLoading: false }],
  useForwardMessagesMutation: () => [api.forwardMany, { isLoading: false }],
}));
vi.mock('@/entities/chat', () => ({
  useGetOneOnOneChatsQuery: () => ({ data: { chats: [
    { id: '1', interlocutor_name: 'anna', interlocutor_display_name: 'Anna <:party_cat:42>', last_message: { id: '9', content: 'old', timestamp: '2026-11-01T10:00:00Z' } },
    { id: '2', interlocutor_name: 'bob', interlocutor_display_name: 'Bob', last_message: { id: '8', content: 'new', timestamp: '2026-11-20T10:00:00Z' } },
    { id: '3', interlocutor_name: 'cleo', interlocutor_display_name: 'Cleo', is_pinned: true, pin_position: 0, last_message: null },
  ] } }),
  useGetGroupChatsQuery: () => ({ data: { groups: [{ chat_id: '7', name: 'Team', last_message: null }] } }),
}));
vi.mock('@/entities/user', () => ({ useGetBlockedUsersQuery: () => ({ data: { users: [] } }) }));
vi.mock('@/shared/api/currentUserApi', () => ({ useGetCurrentUserQuery: () => ({ data: { id: '5', username: 'alice' } }) }));
vi.mock('@/shared/ui/sonner', () => ({ toast: api.toast }));
vi.mock('@/shared/api/useAuthenticatedMedia', () => ({ useAuthenticatedMedia: (source?: string) => source }));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: ({ alt }: { alt?: string }) => <img alt={alt ?? ''} /> }));

const show = (ui: ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);
const toastText = () => {
  const view = render(<>{api.toast.mock.lastCall?.[0] as ReactNode}</>);
  const text = view.container.textContent;
  const emoji = view.container.querySelector('img')?.getAttribute('alt');
  view.unmount();
  return { text, emoji };
};

const message = { id: '42', sender: 'alice', content: 'hi', timestamp: '', type: 'message', read_by: [] } as unknown as Message;
const ok = () => ({ unwrap: () => Promise.resolve({ forwarded: [], failed: [] }) });
const names = () => screen.getAllByTestId('forward-target').map((item) => item.querySelector('img')?.getAttribute('alt')?.split(' ')[0]);
const row = (name: string) => screen.getAllByTestId('forward-target').find((item) => item.querySelector('img')?.getAttribute('alt')?.startsWith(name))!;

const desktop = () => {
  vi.stubGlobal('innerWidth', 1024);
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
};
const phone = () => {
  vi.stubGlobal('innerWidth', 390);
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
};

beforeEach(() => {
  api.forwardOne.mockReset().mockReturnValue(ok());
  api.forwardMany.mockReset().mockReturnValue(ok());
  api.toast.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

it('focuses the phone screen without opening the keyboard, but allows tapping to search', async () => {
  phone();
  show(<ForwardMessageDialog open onOpenChange={vi.fn()} message={null} username="alice" />);
  expect(screen.getByRole('dialog')).toHaveFocus();
  expect(screen.getByRole('textbox')).not.toHaveFocus();
  const user = userEvent.setup();
  await user.click(screen.getByRole('textbox'));
  await user.keyboard('bob');
  expect(screen.getByRole('textbox')).toHaveValue('bob');
  expect(names()).toEqual(['Bob']);
});

it('keeps automatic search focus on desktop', async () => {
  desktop();
  show(<ForwardMessageDialog open onOpenChange={vi.fn()} message={null} username="alice" />);
  await waitFor(() => expect(screen.getByRole('textbox')).toHaveFocus());
});

it('lists the chats in chat list order: pinned first, then the newest', () => {
  desktop();
  show(<ForwardMessageDialog open onOpenChange={vi.fn()} message={message} username="alice" />);
  expect(names()).toEqual(['Cleo', 'Bob', 'Anna', 'Team']);
  expect(within(row('Bob')).getByText('new')).toBeInTheDocument();
});

it('sends to one chat at once with a click and says where it went', async () => {
  desktop();
  const onOpenChange = vi.fn();
  show(<ForwardMessageDialog open onOpenChange={onOpenChange} message={message} username="alice" />);
  fireEvent.click(row('Anna'));
  await waitFor(() => expect(api.forwardOne).toHaveBeenCalledWith({ sourceMessageId: '42', targetChatIds: ['1'] }));
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  expect(toastText()).toEqual({ text: 'Forwarded to Anna ', emoji: ':party_cat:' });
});

it('picks several chats with Ctrl+click on desktop and sends to all of them', async () => {
  desktop();
  show(<ForwardMessageDialog open onOpenChange={vi.fn()} message={message} username="alice" />);
  fireEvent.click(row('Anna'), { ctrlKey: true });
  fireEvent.click(row('Bob'));
  expect(api.forwardOne).not.toHaveBeenCalled();
  expect(screen.getByRole('heading', { name: '2 selected' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Send \(2\)/ }));
  await waitFor(() => expect(api.forwardOne).toHaveBeenCalledWith({ sourceMessageId: '42', targetChatIds: ['1', '2'] }));
  expect(api.toast).toHaveBeenCalledWith('Forwarded to 2 chats');
});

it('picks several chats with a long press on a phone', async () => {
  phone();
  vi.useFakeTimers();
  show(<ForwardMessageDialog open onOpenChange={vi.fn()} message={message} username="alice" />);
  fireEvent.touchStart(row('Anna'), { touches: [{ clientX: 10, clientY: 10 }], changedTouches: [{ clientX: 10, clientY: 10 }] });
  act(() => { vi.advanceTimersByTime(500); });
  fireEvent.touchEnd(row('Anna'), { changedTouches: [{ clientX: 10, clientY: 10 }] });
  fireEvent.click(row('Anna'));
  fireEvent.click(row('Team'));
  vi.useRealTimers();
  expect(api.forwardOne).not.toHaveBeenCalled();
  expect(screen.getAllByRole('checkbox', { checked: true })).toHaveLength(2);
});

it('sends to the highlighted chat with Enter after moving with the arrow keys', async () => {
  desktop();
  show(<ForwardMessageDialog open onOpenChange={vi.fn()} message={message} username="alice" />);
  const search = screen.getByRole('textbox');
  fireEvent.keyDown(search, { key: 'ArrowDown' });
  fireEvent.keyDown(search, { key: 'Enter' });
  await waitFor(() => expect(api.forwardOne).toHaveBeenCalledWith({ sourceMessageId: '42', targetChatIds: ['2'] }));
});

it('forwards a whole selection of messages to the chosen chats', async () => {
  desktop();
  show(<ForwardMessageDialog open onOpenChange={vi.fn()} message={null} bulk={{ chatId: '9', messageIds: ['1', '2'] }} username="alice" />);
  fireEvent.click(row('Team'));
  await waitFor(() => expect(api.forwardMany).toHaveBeenCalledWith({ chatId: '9', messageIds: ['1', '2'], targetChatIds: ['7'] }));
});
