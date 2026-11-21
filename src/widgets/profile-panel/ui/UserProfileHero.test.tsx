import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { en } from '@/shared/lang/en';
import UserProfileHero from './UserProfileHero';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en } = await vi.importActual<typeof import('@/shared/lang/en')>('@/shared/lang/en');
  return { useLanguage: () => ({ language: 'en', translations: en }) };
});
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: (props: { alt?: string }) => <img alt={props.alt} /> }));
vi.mock('@/entities/user', () => ({ useGetCommonGroupsQuery: () => ({ data: [] }) }));
vi.mock('@/features/calls', () => ({ CallButton: () => <button type="button">call</button>, useCallsAvailable: () => true }));
vi.mock('@/features/chat-mute', () => ({ ChatMuteAction: () => <button type="button">mute</button> }));
vi.mock('@/features/moderation', async () => ({
  ...await vi.importActual<typeof import('@/features/moderation')>('@/features/moderation'),
  ReportUserDialog: ({ name }: { name: string }) => <div role="dialog">report {name}</div>,
}));
const actions = vi.hoisted(() => ({ openDelete: vi.fn(), openClear: vi.fn(), openBlock: vi.fn() }));
vi.mock('@/features/chat-cleanup', async () => {
  const { useState } = await vi.importActual<typeof import('react')>('react');
  return {
    useChatActions: () => {
      const [reporting, setReporting] = useState<{ userId: string; name: string } | null>(null);
      return {
        ...actions, isBlocked: () => false, dialogs: null, reporting, closeReport: () => setReporting(null),
        openReport: async (target: { userId?: string; name: string }) => setReporting({ userId: target.userId ?? '0', name: target.name }),
      };
    },
  };
});

const renderHero = (overrides: Partial<React.ComponentProps<typeof UserProfileHero>> = {}) => {
  const props: React.ComponentProps<typeof UserProfileHero> = {
    username: 'bea', displayName: 'Bea', accountDisplayName: 'Bea', avatarUrl: '/bea.png', hasCustomAvatar: false,
    isOnline: false, directChatId: '7', canMessage: true, isBlocked: false,
    tabs: ['details'], activeView: 'details', onSelectView: vi.fn(), onMessage: vi.fn(), onAvatarHistory: vi.fn(),
    onChatDeleted: vi.fn(), isCurrentUser: false, isEditingContactName: false, customNameInput: '',
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
    const target = expect.objectContaining({ chatId: '7', username: 'bea', name: 'Bea' });
    expect(actions.openClear).toHaveBeenCalledWith(target);
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: en.chatCleanup.deleteChat }));
    expect(actions.openDelete).toHaveBeenCalledWith(target);
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: en.profileRework.block }));
    expect(actions.openBlock).toHaveBeenCalledWith(target);
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: en.profileRework.rename }));
    expect(props.onEditContactName).toHaveBeenCalledOnce();
  });

  it('shows no call, mute or more menu on your own profile', () => {
    renderHero({ isCurrentUser: true, canMessage: false });
    expect(screen.queryByText('mute')).not.toBeInTheDocument();
    expect(screen.queryByText('call')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: en.profileRework.more })).not.toBeInTheDocument();
  });

  it('shows online status for others but not on your own profile', () => {
    renderHero({ isOnline: true });
    expect(screen.getByTestId('profile-online-dot')).toBeInTheDocument();
    expect(screen.getByTestId('profile-presence')).toHaveTextContent(en.profileRework.onlineNow);
  });

  it('offers a report for other users and shows the restricted account label', () => {
    renderHero({ userId: '9', accountLabel: 'restricted' });
    expect(screen.getByTestId('restricted-account-label')).toHaveTextContent(en.moderation.restrictedLabel);
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: en.moderation.report }));
    expect(screen.getByRole('dialog')).toHaveTextContent('report Bea');
  });

  it('has no report entry on your own profile', () => {
    renderHero({ userId: '9', isCurrentUser: true, canMessage: false });
    expect(screen.queryByTestId('restricted-account-label')).not.toBeInTheDocument();
    if (screen.queryByRole('button', { name: en.profileRework.more })) openMenu();
    expect(screen.queryByRole('menuitem', { name: en.moderation.report })).not.toBeInTheDocument();
  });

  it('leaves out the online dot and status on your own profile', () => {
    renderHero({ isOnline: true, isCurrentUser: true, canMessage: false });
    expect(screen.queryByTestId('profile-online-dot')).not.toBeInTheDocument();
    expect(screen.queryByTestId('profile-presence')).not.toBeInTheDocument();
    expect(screen.getByText('@bea')).toBeInTheDocument();
  });
});

