import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Chat } from '@/entities/message';
import { en } from '@/shared/lang/en';

const state = vi.hoisted(() => ({ users: [] as unknown[], groups: [] as unknown[], scope: 0 }));
const client = vi.hoisted(() => ({ GET: vi.fn() }));
vi.mock('@/shared/api/client', () => ({ apiClient: client }));
vi.mock('@/shared/offline', async (importOriginal) => ({ ...await importOriginal<object>(), getOfflineDb: async () => null }));
vi.mock('@/shared/api/indexedStore', async (importOriginal) => ({ ...await importOriginal<object>(), sessionScope: () => `test-${state.scope}` }));
vi.mock('@/entities/user', () => ({
  useSearchUsersQuery: (_query: string, { skip }: { skip: boolean }) => ({ currentData: skip ? undefined : { users: state.users } }),
}));
vi.mock('@/entities/group', () => ({
  useSearchPublicGroupsQuery: (_query: string, { skip }: { skip: boolean }) => ({ currentData: skip ? undefined : state.groups }),
}));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: () => <img alt="" /> }));

const { default: ChatSearchOverlay } = await import('./ChatSearchOverlay');

const tripChat = { id: '2', name: 'trip-team', display_name: 'Trip team', type: 'group', avatar_url: '' } as unknown as Chat;
const otherChat = { id: '3', name: 'bob', display_name: 'Bob', type: 'one-on-one', avatar_url: '' } as unknown as Chat;
const serverMessage = (id: string, chatId: string, content: string) => ({
  id, chat_id: chatId, type: 'text', content, created_at: '2026-11-20T10:00:00Z', reactions: [], sender: { id: '8', display_name: 'Bob' },
});
const ok = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) });

const handlers = () => ({ onChatOpen: vi.fn(), onChatClick: vi.fn(), onJumpToMessage: vi.fn(), onClose: vi.fn() });

const renderOverlay = (props = handlers()) => {
  render(
    <ChatSearchOverlay visible showSearch circleStyle={null} circleActive translations={en} language="en" username="me" currentUserId="1"
      chats={[tripChat, otherChat]} activeChatId="3" oneOnOneChats={[]} {...props} />,
  );
  return props;
};

const type = (text: string) => fireEvent.change(screen.getByTestId('global-search-input'), { target: { value: text } });

beforeEach(() => {
  state.scope += 1;
  state.users = [];
  state.groups = [];
  client.GET.mockReset().mockResolvedValue(ok({ items: [
    { message: serverMessage('9', '2', 'our trip plan'), highlight: 'our trip plan' },
    { message: serverMessage('7', '3', 'trip photos'), highlight: null },
  ], next_cursor: null }));
  window.history.replaceState({}, '', '/');
});

describe('global search overlay', () => {
  it('shows tabs, chats and messages with highlighted matches while typing', async () => {
    renderOverlay();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['All', 'Messages', 'Media', 'Links', 'Files']);
    type('trip');
    const chats = await screen.findByTestId('global-search-chats');
    expect(within(chats).getByText('Trip team')).toBeInTheDocument();
    const messages = await screen.findByTestId('global-search-messages');
    expect(within(messages).getAllByTestId('global-search-message').map((row) => row.dataset.messageId)).toEqual(['9', '7']);
    expect(messages.querySelector('mark')?.textContent).toBe('trip');
    expect(client.GET).toHaveBeenCalledWith('/search/messages', expect.objectContaining({ params: { query: { q: 'trip', limit: 30 } } }));
  });

  it('opens the chat of a message and jumps to it', async () => {
    const props = renderOverlay();
    type('trip');
    const rows = await screen.findAllByTestId('global-search-message');
    fireEvent.click(rows[0]);
    expect(props.onJumpToMessage).toHaveBeenCalledWith('2', '9');
    expect(props.onChatClick).toHaveBeenCalledWith(tripChat);
    expect(props.onClose).toHaveBeenCalled();
  });

  it('jumps without reopening the chat that is already open', async () => {
    const props = renderOverlay();
    type('trip');
    fireEvent.click((await screen.findAllByTestId('global-search-message'))[1]);
    expect(props.onJumpToMessage).toHaveBeenCalledWith('3', '7');
    expect(props.onChatClick).not.toHaveBeenCalled();
  });

  it('lists recent searches on an empty box and clears them', async () => {
    renderOverlay();
    expect(screen.getByText(en.globalSearch.noRecent)).toBeInTheDocument();
    type('trip');
    fireEvent.keyDown(screen.getByTestId('global-search-input'), { key: 'Enter' });
    type('');
    await waitFor(() => expect(screen.getAllByTestId('global-search-recent-item').map((item) => item.textContent)).toEqual(['trip']));
    fireEvent.click(screen.getByRole('button', { name: en.globalSearch.clearRecent }));
    expect(screen.queryByTestId('global-search-recent-item')).toBeNull();
    expect(screen.getByText(en.globalSearch.noRecent)).toBeInTheDocument();
  });

  it('asks the server for one kind on the media tab', async () => {
    renderOverlay();
    fireEvent.click(screen.getByRole('tab', { name: 'Media' }));
    await waitFor(() => expect(client.GET).toHaveBeenCalled());
    expect(client.GET.mock.calls[0][1].params.query).toEqual({ kind: 'visual', limit: 30 });
  });

  it('shows device results with a note when the server cannot be reached', async () => {
    client.GET.mockRejectedValue(new TypeError('Failed to fetch'));
    renderOverlay();
    type('trip');
    expect(await screen.findByTestId('global-search-on-device')).toHaveTextContent(en.globalSearch.onDevice);
  });

  it('opens a found person as a new chat and a public group at its link', async () => {
    state.users = [{ id: '5', username: 'carol', display_name: 'Carol', avatar_url: null }];
    state.groups = [{ group: { name: 'Hikers', public_name: 'hikers', avatar_url: null }, chat_id: null }];
    const props = renderOverlay();
    type('car');
    fireEvent.click(await screen.findByTestId('user-search-result'));
    expect(props.onChatOpen).toHaveBeenCalledWith(expect.any(Number), 'carol', false, 'one-on-one');
    fireEvent.click(screen.getByTestId('group-search-result'));
    expect(window.location.pathname).toBe('/@hikers');
  });

  it('sends a picked type filter, shows it on the chip and clears it', async () => {
    const props = renderOverlay();
    type('trip');
    await screen.findAllByTestId('global-search-message');
    const chip = screen.getByTestId('global-search-filter-type');
    fireEvent.click(within(chip).getByRole('button'));
    fireEvent.keyDown(await screen.findByRole('button', { name: en.globalSearch.types.file }), { key: 'Escape' });
    expect(props.onClose).not.toHaveBeenCalled();
    fireEvent.click(within(chip).getByRole('button'));
    fireEvent.click(await screen.findByRole('button', { name: en.globalSearch.types.file }));
    await waitFor(() => expect(client.GET).toHaveBeenLastCalledWith('/search/messages',
      expect.objectContaining({ params: { query: { q: 'trip', type: 'file', limit: 30 } } })));
    expect(chip).toHaveTextContent(en.globalSearch.types.file);
    fireEvent.click(within(chip).getByRole('button', { name: `${en.globalSearch.filters.clear}: ${en.globalSearch.filters.type}` }));
    expect(chip).toHaveTextContent(en.globalSearch.filters.type);
  });

  it('says nothing was found only when there are no people and no messages', async () => {
    client.GET.mockResolvedValue(ok({ items: [], next_cursor: null }));
    state.users = [{ id: '5', username: 'carol', display_name: 'Carol', avatar_url: null }];
    renderOverlay();
    type('car');
    await screen.findByTestId('user-search-result');
    await waitFor(() => expect(client.GET).toHaveBeenCalled());
    expect(screen.queryByText(en.globalSearch.nothingFound)).toBeNull();
    state.users = [];
    type('zzz');
    expect(await screen.findByText(en.globalSearch.nothingFound)).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    const props = renderOverlay();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalled();
  });
});
