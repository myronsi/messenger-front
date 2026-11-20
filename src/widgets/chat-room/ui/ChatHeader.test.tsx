import { fireEvent, render, screen } from '@testing-library/react';
import { longPress } from '@/test/longPress';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ChatHeader from './ChatHeader';

vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: () => <img alt="" /> }));
vi.mock('@/features/profile', () => ({ useGetCurrentUserQuery: () => ({ data: { username: 'me' } }) }));
const peer = vi.hoisted(() => ({ current: undefined as undefined | { id: string; account_label?: string } }));
vi.mock('@/entities/user', () => ({ useGetUserByUsernameQuery: () => ({ data: peer.current }) }));
vi.mock('@/features/moderation', async () => ({
  ...await vi.importActual<typeof import('@/features/moderation')>('@/features/moderation'),
  ReportUserDialog: ({ name }: { name: string }) => <div role="dialog">report {name}</div>,
}));
const cleanup = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock('@/features/chat-cleanup', () => ({
  useChatCleanup: () => ({ request: null, open: cleanup.open, close: vi.fn(), confirm: vi.fn(), busy: false }),
  ChatCleanupDialog: () => null,
}));
const mobile = vi.hoisted(() => ({ current: false }));
vi.mock('@/shared/hooks/use-mobile', () => ({ useIsMobile: () => mobile.current }));
vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations: { ...en, search: 'Search', back: 'Back' } }) };
});

beforeEach(() => { vi.useFakeTimers(); peer.current = undefined; mobile.current = false; cleanup.open.mockReset(); });
afterEach(() => vi.useRealTimers());

it('opens the direct chat search with a long press on the header', () => {
  const onOpenSearch = vi.fn();
  const onOpenProfile = vi.fn();
  render(<ChatHeader chatName="alice" chatDisplayName="Alice" interlocutorDeleted={false} onBack={vi.fn()} onDeleteChat={vi.fn()}
    onOpenProfile={onOpenProfile} onOpenSearch={onOpenSearch} interlocutorAvatar="/a.png" />);
  longPress(screen.getByText('Alice'));
  expect(onOpenSearch).toHaveBeenCalledOnce();
  expect(onOpenProfile).not.toHaveBeenCalled();
});

it('names the chat with yourself after you without presence', () => {
  render(<ChatHeader chatName="me" chatDisplayName="Mia Stone" isOnline interlocutorDeleted={false} onBack={vi.fn()} onDeleteChat={vi.fn()}
    onOpenProfile={vi.fn()} interlocutorAvatar="/me.png" />);
  expect(screen.getByText('Mia Stone (you)')).toBeInTheDocument();
  expect(screen.queryByText(/online/i)).not.toBeInTheDocument();
});

it('keeps last seen on one short line on phones and gives the full wording as a tooltip', () => {
  vi.setSystemTime(new Date(2026, 10, 17, 19, 43));
  const lastSeen = new Date(2026, 10, 16, 3, 11).toISOString();
  render(<ChatHeader chatName="mai" chatDisplayName="Mai" isOnline={false} lastSeen={lastSeen} interlocutorDeleted={false} onBack={vi.fn()}
    onDeleteChat={vi.fn()} onOpenProfile={vi.fn()} interlocutorAvatar="/m.png" />);
  const presence = screen.getByTestId('chat-header-presence');
  expect(presence).toHaveClass('truncate');
  expect(presence).toHaveAttribute('title', expect.stringMatching(/^last seen yesterday at /));
  const [phone, wide] = Array.from(presence.children);
  expect(phone).toHaveClass('md:hidden');
  expect(phone).toHaveTextContent(/^seen yesterday, /);
  expect(wide).toHaveClass('max-md:hidden');
  expect(wide).toHaveTextContent(/^last seen yesterday at /);
});

it('shows the restricted account label and offers a report from the header menu', () => {
  peer.current = { id: '42', account_label: 'restricted' };
  render(<ChatHeader chatName="eve" chatDisplayName="Eve" interlocutorDeleted={false} onBack={vi.fn()} onDeleteChat={vi.fn()}
    onOpenProfile={vi.fn()} interlocutorAvatar="/e.png" />);
  expect(screen.getByTestId('restricted-account-label')).toHaveTextContent('Restricted account');
  fireEvent.pointerDown(screen.getByRole('button', { name: 'More' }), { button: 0, ctrlKey: false, pointerType: 'mouse' });
  fireEvent.click(screen.getByRole('menuitem', { name: 'Report' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('report Eve');
});

it('has no report menu or label for the chat with yourself', () => {
  peer.current = { id: '1', account_label: 'restricted' };
  render(<ChatHeader chatName="me" chatDisplayName="Mia" interlocutorDeleted={false} onBack={vi.fn()} onDeleteChat={vi.fn()}
    onOpenProfile={vi.fn()} interlocutorAvatar="/me.png" />);
  expect(screen.queryByTestId('restricted-account-label')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument();
});

const openMenu = () => fireEvent.pointerDown(screen.getByRole('button', { name: 'More' }), { button: 0, ctrlKey: false, pointerType: 'mouse' });

it('offers clear history, delete chat and report in the desktop menu', () => {
  peer.current = { id: '42' };
  const onDeleteChat = vi.fn();
  render(<ChatHeader chatId="77" chatName="eve" chatDisplayName="Eve" interlocutorDeleted={false} onBack={vi.fn()} onDeleteChat={onDeleteChat}
    onOpenProfile={vi.fn()} interlocutorAvatar="/e.png" />);
  openMenu();
  expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Clear history', 'Delete chat', 'Report']);
  fireEvent.click(screen.getByRole('menuitem', { name: 'Clear history' }));
  expect(cleanup.open).toHaveBeenCalledWith({ kind: 'clear', target: expect.objectContaining({ chatId: '77', name: 'Eve', isGroup: false }) });
  openMenu();
  fireEvent.click(screen.getByRole('menuitem', { name: 'Delete chat' }));
  expect(onDeleteChat).toHaveBeenCalled();
});

it('has no three-dot menu on phones', () => {
  mobile.current = true;
  peer.current = { id: '42' };
  render(<ChatHeader chatId="77" chatName="eve" chatDisplayName="Eve" interlocutorDeleted={false} onBack={vi.fn()} onDeleteChat={vi.fn()}
    onOpenProfile={vi.fn()} interlocutorAvatar="/e.png" />);
  expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument();
});

