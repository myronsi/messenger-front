import { fireEvent, render, screen, within } from '@testing-library/react';
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
const report = vi.hoisted(() => vi.fn());
vi.mock('@/entities/message', () => ({ requestContentReport: report }));
vi.mock('@/shared/api/goSocket', () => ({ isGoApi: () => true }));
vi.mock('@/features/chat-cleanup', () => ({ useChatCleanup: () => ({ request: null, open: vi.fn(), close: vi.fn(), confirm: vi.fn() }), ChatCleanupDialog: () => null }));

const leave = vi.fn();
const renderShell = (currentGroupAvatar: string, currentRole?: string) => render(
  <GroupProfileDialogShell
    chatId="31" canMute={false} open isClosing={false} onOpenChange={vi.fn()}
    currentGroupName="Team" currentGroupAvatar={currentGroupAvatar} participants={[]} visibleViews={['details', 'participants']}
    canShowPhotosAction={false} canShowAudiosAction={false} activeView="details" panelTransition={null}
    onSelectView={vi.fn()} renderPanelContent={() => null} groupConfirm={null} onCloseGroupConfirm={vi.fn()}
    isAvatarViewerOpen={false} setIsAvatarViewerOpen={vi.fn()} currentRole={currentRole} onLeaveGroup={currentRole === 'owner' ? undefined : leave}
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

  it('shows no add-member tile above the card, even to admins', () => {
    renderShell(getAvatarSrc(DEFAULT_GROUP_AVATAR), 'admin');
    expect(within(screen.getByTestId('profile-action-tiles')).queryByRole('button', { name: 'Invite' })).not.toBeInTheDocument();
  });

  it('lets members clear the history, report or leave the group from the More menu', () => {
    renderShell(getAvatarSrc(DEFAULT_GROUP_AVATAR), 'member');
    fireEvent.pointerDown(screen.getByRole('button', { name: 'More' }), { button: 0, ctrlKey: false, pointerType: 'mouse' });
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Clear history', 'Report group', 'Leave group']);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Report group' }));
    expect(report).toHaveBeenCalledWith({ kind: 'group', chatId: '31', name: 'Team' });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'More' }), { button: 0, ctrlKey: false, pointerType: 'mouse' });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Leave group' }));
    expect(leave).toHaveBeenCalledOnce();
  });

  it('shows the owner a Clear history button and no More menu', () => {
    renderShell(getAvatarSrc(DEFAULT_GROUP_AVATAR), 'owner');
    const tiles = screen.getByTestId('profile-action-tiles');
    expect(within(tiles).getByRole('button', { name: 'Clear history' })).toBeInTheDocument();
    expect(within(tiles).queryByRole('button', { name: 'More' })).not.toBeInTheDocument();
  });

  it('offers an Edit tile only when the group can be edited', () => {
    const onEdit = vi.fn();
    const { unmount } = render(
      <GroupProfileDialogShell
        chatId="31" canMute={false} open isClosing={false} onOpenChange={vi.fn()}
        currentGroupName="Team" currentGroupAvatar={getAvatarSrc(DEFAULT_GROUP_AVATAR)} participants={[]} visibleViews={['details']}
        canShowPhotosAction={false} canShowAudiosAction={false} activeView="details" panelTransition={null}
        onSelectView={vi.fn()} renderPanelContent={() => null} groupConfirm={null} onCloseGroupConfirm={vi.fn()}
        isAvatarViewerOpen={false} setIsAvatarViewerOpen={vi.fn()} currentRole="admin" onEdit={onEdit}
      />,
    );
    fireEvent.click(within(screen.getByTestId('profile-action-tiles')).getByRole('button', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledOnce();
    unmount();
    renderShell(getAvatarSrc(DEFAULT_GROUP_AVATAR), 'member');
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });
});
