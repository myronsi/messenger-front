import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import UserProfileHero from './UserProfileHero';

const cleanupOpen = vi.fn();
vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en } = await vi.importActual<typeof import('@/shared/lang/en')>('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations: en }) };
});
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: (props: { alt?: string }) => <img alt={props.alt} /> }));
vi.mock('@/entities/user', () => ({ useGetCommonGroupsQuery: () => ({ data: [] }) }));
vi.mock('@/features/calls', () => ({ CallButton: () => <button type="button">call</button>, useCallsAvailable: () => true }));
vi.mock('@/features/chat-mute', () => ({ ChatMuteAction: () => <button type="button">mute</button> }));
vi.mock('@/features/chat-cleanup', () => ({
  useChatCleanup: () => ({ request: null, open: cleanupOpen, close: vi.fn(), confirm: vi.fn() }), ChatCleanupDialog: () => null,
}));

const renderHero = (overrides: Partial<React.ComponentProps<typeof UserProfileHero>> = {}) => {
  const props: React.ComponentProps<typeof UserProfileHero> = {
    username: 'bea', displayName: 'Bea', accountDisplayName: 'Bea', avatarUrl: '/bea.png', hasCustomAvatar: false,
    isOnline: false, directChatId: '7', canMessage: true, isBlocked: false, canDeleteChat: true,
    tabs: ['details'], activeView: 'details', onSelectView: vi.fn(), onMessage: vi.fn(), onAvatarHistory: vi.fn(),
    onDeleteChat: vi.fn(), onBlock: vi.fn(), isCurrentUser: false, isEditingContactName: false, customNameInput: '',
    setCustomNameInput: vi.fn(), onSaveContactName: vi.fn(), onCancelContactNameEdit: vi.fn(), onEditContactName: vi.fn(),
    isSavingContactName: false, ...overrides,
  };
  render(<UserProfileHero {...props} />);
  return props;
};

const openMenu = () => fireEvent.pointerDown(screen.getByRole('button', { name: en.profileRework.more }), { button: 0, ctrlKey: false, pointerType: 'mouse' });

describe('UserProfileHero', () => {
  it('keeps clear, delete and block in the More menu', () => {
    const props = renderHero();
    expect(screen.queryByRole('button', { name: en.profileRework.block })).not.toBeInTheDocument();
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: en.chatCleanup.clearHistory }));
    expect(cleanupOpen).toHaveBeenCalledWith(expect.objectContaining({ kind: 'clear' }));
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: en.chatCleanup.deleteChat }));
    expect(props.onDeleteChat).toHaveBeenCalledOnce();
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: en.profileRework.block }));
    expect(props.onBlock).toHaveBeenCalledOnce();
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: en.profileRework.rename }));
    expect(props.onEditContactName).toHaveBeenCalledOnce();
  });

  it('shows your own chat tools without call, mute and block', () => {
    renderHero({ isCurrentUser: true, canMessage: false });
    expect(screen.queryByText('mute')).not.toBeInTheDocument();
    expect(screen.queryByText('call')).not.toBeInTheDocument();
    openMenu();
    expect(screen.getByRole('menuitem', { name: en.chatCleanup.clearHistory })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: en.chatCleanup.deleteChat })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: en.profileRework.block })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: en.profileRework.rename })).not.toBeInTheDocument();
  });
});
