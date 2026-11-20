import { ModalSurface } from '@/shared/ui/ModalSurface';
import { mobileWindowSlide } from '@/shared/ui/windowMotion';
import { SwipeProfilePanels } from '@/shared/ui/SwipeProfilePanels';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import React from 'react';
import type { EntityId } from '@/shared/api/entityId';
import { ChatMuteAction } from '@/features/chat-mute';
import { Eraser, UserPlus } from 'lucide-react';
import { CallButton, useCallsAvailable } from '@/features/calls';
import { ProfileActions, ProfileBanner, ProfileCloseButton, ProfileTabs, type ProfileMenuItem, type ProfileTile } from '@/shared/ui/profile/ProfileHero';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { ProfilePageBackdrop } from '@/shared/ui/profile/ProfileBackgroundFill';
import type { ProfileBackground } from '@/entities/user';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { toast } from '@/shared/ui/sonner';
import { ChatCleanupDialog, useChatCleanup } from '@/features/chat-cleanup';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { GroupTranslations } from './groupChatTypes';
import GroupAvatarViewer from './GroupAvatarViewer';
import { DEFAULT_GROUP_AVATAR } from '@/shared/base/ui';
import { getAvatarSrc } from './groupChatUtils';
import type { GroupProfileConfirmState, GroupParticipant } from './GroupProfileTypes';

type GroupProfileView = 'details' | 'participants' | 'photos' | 'audios' | 'files' | 'links' | 'voice' | 'emoji';
type GroupProfileTransition = { from: GroupProfileView; to: GroupProfileView; direction: 'forward' | 'back'; key: number; };
interface Props {
  chatId: EntityId;
  canMute: boolean;
  open: boolean;
  isClosing: boolean;
  onOpenChange: (open: boolean) => void;
  currentGroupName: string;
  currentGroupAvatar: string;
  participants: GroupParticipant[];
  visibleViews: GroupProfileView[];
  description?: string;
  currentRole?: string;
  canShowPhotosAction: boolean;
  canShowAudiosAction: boolean;
  canShowFilesAction?: boolean;
  activeView: GroupProfileView;
  panelTransition: GroupProfileTransition | null;
  onSelectView: (view: GroupProfileView) => void;
  renderPanelContent: (view: GroupProfileView) => React.ReactNode;
  groupConfirm: GroupProfileConfirmState | null;
  onCloseGroupConfirm: () => void;
  isAvatarViewerOpen: boolean;
  setIsAvatarViewerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  subPage?: React.ReactNode;
  background?: ProfileBackground | null;
}

const GroupProfileDialogShell: React.FC<Props> = ({
  chatId, canMute, open, isClosing, onOpenChange, currentGroupName, currentGroupAvatar, participants, visibleViews, currentRole,
  activeView, panelTransition, onSelectView, renderPanelContent,
  groupConfirm, onCloseGroupConfirm, isAvatarViewerOpen, setIsAvatarViewerOpen, subPage = null, background,
}) => {
  const { translations: rawTranslations } = useLanguage();
  const translations = rawTranslations as unknown as GroupTranslations;
  const requestClose = () => onOpenChange(false);
  const isMobile = useIsMobile();
  const closeButton = (
    <ProfileCloseButton mobile={isMobile} onClick={requestClose} backLabel={rawTranslations.back || 'Back'} closeLabel={rawTranslations.close} />
  );
  const hasCustomAvatar = !!currentGroupAvatar && currentGroupAvatar !== getAvatarSrc(DEFAULT_GROUP_AVATAR);
  const t = rawTranslations.profileRework;
  const callsAvailable = useCallsAvailable();
  const cleanup = useChatCleanup(() => toast(rawTranslations.chatCleanup.cleared), (message) => toast(message || rawTranslations.errorLoading));
  const online = participants.filter((participant) => participant.is_online).length;
  const count = String(participants.length);
  const tabLabels: Record<GroupProfileView, string> = {
    details: t.info, participants: t.members, photos: t.media, audios: t.audio, files: t.files, links: t.links, voice: t.voice,
    emoji: rawTranslations.customEmoji.groupEmoji,
  };
  const tiles: ProfileTile[] = [
    ...(callsAvailable ? [{
      key: 'call', label: t.call, render: (className: string) => <span className={`${className} [&>button]:h-full [&>button]:w-full [&>button]:rounded-xl`}><CallButton chatId={chatId} /></span>,
    }] : []),
    ...(currentRole === 'owner' || currentRole === 'admin' ? [
      { key: 'invite', label: t.invite, primary: !canMute, icon: <UserPlus className="h-5 w-5" />, onClick: () => onSelectView('participants') },
    ] : []),
    ...(canMute ? [{ key: 'mute', label: t.mute, primary: true, render: (className: string) => <ChatMuteAction chatId={chatId} className={className} /> }] : []),
  ];
  const menu: ProfileMenuItem[] = [{
    key: 'clear', label: rawTranslations.chatCleanup.clearHistory, icon: <Eraser className="h-4 w-4" />, onSelect: () => cleanup.open({ kind: 'clear', target: {
      chatId, name: currentGroupName, isGroup: true, isSaved: false, canClearForEveryone: currentRole === 'owner' || currentRole === 'admin',
    } }),
  }];
  const groupAvatar = <AuthenticatedImage src={currentGroupAvatar} alt={currentGroupName} className="h-full w-full object-cover" />;

  if (!open) return null;


  return (
    <ModalSurface label={translations.groupProfile || 'Group profile'}
      className={`fixed inset-0 z-[1000] flex items-center justify-center bg-transparent px-0 py-0 sm:bg-black/40 sm:px-6 sm:py-6 sm:transition-opacity sm:duration-200 sm:ease-out ${
        isClosing ? 'sm:opacity-0' : 'sm:opacity-100'
      }`}
      onMouseDown={requestClose}
    >
      <div
        className={`relative h-full w-full max-w-full overflow-hidden bg-background shadow-2xl sm:h-[min(780px,calc(100vh-3rem))] sm:w-[420px] sm:rounded-lg sm:transition-all sm:duration-200 sm:ease-out ${
          mobileWindowSlide(!isClosing)} ${isClosing ? 'sm:translate-y-3 sm:scale-95 sm:opacity-0' : 'sm:translate-y-0 sm:scale-100 sm:opacity-100'
        }`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div data-profile-swipe className="relative isolate flex h-full min-h-0 w-full flex-col bg-background text-foreground" inert={!!subPage}>
          <ProfilePageBackdrop background={background} />
          <h2 className="sr-only">{translations.groupProfile || 'Group profile'}</h2>
          <div className="min-h-0 flex-1 overflow-hidden overscroll-contain">
            <div className="flex h-full min-h-0 flex-col">
              <div className="shrink-0">
                <ProfileBanner
                  seed={currentGroupName}
                  background={background}
                  avatar={hasCustomAvatar ? <button type="button" aria-label="View group picture" onClick={() => setIsAvatarViewerOpen(true)} className="block h-full w-full">{groupAvatar}</button> : groupAvatar}
                  actions={<ProfileActions tiles={tiles} menu={menu} moreLabel={t.more} />}
                  title={<h3 className="break-words">{currentGroupName}</h3>}
                  subtitle={<span>{online ? fillTemplate(t.membersHere, { count, online: String(online) }) : fillTemplate(t.membersCount, { count })}</span>}
                  topLeft={isMobile && closeButton}
                  topRight={!isMobile && closeButton}
                />
                <ProfileTabs tabs={visibleViews.map((key) => ({ key, label: tabLabels[key] }))} active={activeView} onSelect={onSelectView} />
              </div>

              <SwipeProfilePanels active={activeView} views={visibleViews} onSelect={onSelectView}
                renderPanel={renderPanelContent} enabled={open && !isClosing && !panelTransition && !groupConfirm && !isAvatarViewerOpen && !subPage} />
            </div>
          </div>
        </div>
        {subPage}
        <ChatCleanupDialog request={cleanup.request} onCancel={cleanup.close} onConfirm={(forEveryone) => void cleanup.confirm(forEveryone)} />
        {groupConfirm && (
          <ConfirmModal
            title={groupConfirm.title}
            message={groupConfirm.message}
            consequences={groupConfirm.consequences}
            onConfirm={groupConfirm.onConfirm}
            onCancel={onCloseGroupConfirm}
            confirmText={groupConfirm.confirmText}
            isError={!!groupConfirm.isError}
            isDestructive={!!groupConfirm.isDestructive}
            contained
          />
        )}
        {isAvatarViewerOpen && hasCustomAvatar && (
          <GroupAvatarViewer
            avatarUrl={currentGroupAvatar}
            groupName={currentGroupName}
            onClose={() => setIsAvatarViewerOpen(false)}
          />
        )}
      </div>
    </ModalSurface>
  );
};

export default GroupProfileDialogShell;
