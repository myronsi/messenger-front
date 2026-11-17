import { render, screen } from '@testing-library/react';
import { longPress } from '@/test/longPress';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ChatHeader from './ChatHeader';

vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: () => <img alt="" /> }));
vi.mock('@/features/profile', () => ({ useGetCurrentUserQuery: () => ({ data: { username: 'me' } }) }));
vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en } = await import('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations: { ...en, search: 'Search', back: 'Back' } }) };
});

beforeEach(() => vi.useFakeTimers());
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
