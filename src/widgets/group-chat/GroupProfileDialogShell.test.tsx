import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_GROUP_AVATAR } from '@/shared/base/ui';
import { getAvatarSrc } from './groupChatUtils';
import GroupProfileDialogShell from './GroupProfileDialogShell';

vi.mock('@/shared/contexts/LanguageContext', async () => {
  const { en } = await vi.importActual<typeof import('@/shared/lang/en')>('@/shared/lang/en');
  return { useLanguage: () => ({ translations: en }) };
});
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: (props: { alt?: string }) => <img alt={props.alt} /> }));
vi.mock('@/features/chat-mute', () => ({ ChatMuteAction: () => null }));
vi.mock('@/features/calls', () => ({ CallButton: () => <button type="button" aria-label="Start call" />, useCallsAvailable: () => true }));
vi.mock('@/features/chat-cleanup', () => ({ useChatCleanup: () => ({ request: null, open: vi.fn(), close: vi.fn(), confirm: vi.fn() }), ChatCleanupDialog: () => null }));

const renderShell = (currentGroupAvatar: string, currentRole?: string) => render(
  <GroupProfileDialogShell
    chatId="31" canMute={false} open isClosing={false} onOpenChange={vi.fn()}
    currentGroupName="Team" currentGroupAvatar={currentGroupAvatar} participants={[]} visibleViews={['details', 'participants']}
    canShowPhotosAction={false} canShowAudiosAction={false} activeView="details" panelTransition={null}
    onSelectView={vi.fn()} renderPanelContent={() => null} groupConfirm={null} onCloseGroupConfirm={vi.fn()}
    isAvatarViewerOpen={false} setIsAvatarViewerOpen={vi.fn()} currentRole={currentRole}
  />,
);

describe('GroupProfileDialogShell', () => {
  it('does not open the default group picture', () => {
    renderShell(getAvatarSrc(DEFAULT_GROUP_AVATAR));
    expect(screen.queryByRole('button', { name: 'View group picture' })).not.toBeInTheDocument();
    expect(screen.getByAltText('Team')).toBeInTheDocument();
  });

  it('opens a real group picture', () => {
    renderShell('http://127.0.0.1:8080/api/v2/chats/31/avatar');
    expect(screen.getByRole('button', { name: 'View group picture' })).toBeInTheDocument();
  });

  it('offers a group call next to the other tiles', () => {
    renderShell(getAvatarSrc(DEFAULT_GROUP_AVATAR));
    const tiles = screen.getByTestId('profile-action-tiles');
    expect(within(tiles).getByRole('button', { name: 'Start call' })).toBeInTheDocument();
    expect(within(tiles).getByRole('button', { name: 'More' })).toBeInTheDocument();
    expect(within(tiles).queryByRole('button', { name: 'Search' })).not.toBeInTheDocument();
  });

  it('offers invite only to owners and admins', () => {
    const { unmount } = renderShell(getAvatarSrc(DEFAULT_GROUP_AVATAR), 'member');
    expect(screen.queryByRole('button', { name: 'Invite' })).not.toBeInTheDocument();
    unmount();
    renderShell(getAvatarSrc(DEFAULT_GROUP_AVATAR), 'admin');
    expect(screen.getByRole('button', { name: 'Invite' })).toBeInTheDocument();
  });
});
