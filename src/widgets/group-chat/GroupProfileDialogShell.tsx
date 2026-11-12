import { ModalSurface } from '@/shared/ui/ModalSurface';
import { mobileWindowSlide } from '@/shared/ui/windowMotion';
import { SwipeProfilePanels } from '@/shared/ui/SwipeProfilePanels';
import { ProfileTabHighlight } from '@/shared/ui/ProfileTabHighlight';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import React from 'react';
import type { EntityId } from '@/shared/api/entityId';
import { ChatMuteAction } from '@/features/chat-mute';
import { FileText, Image as ImageIcon, Music, UserPlus, Users, X } from 'lucide-react';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { GroupTranslations } from './groupChatTypes';
import GroupAvatarViewer from './GroupAvatarViewer';
import { DEFAULT_GROUP_AVATAR } from '@/shared/base/ui';
import { getAvatarSrc } from './groupChatUtils';
import type { GroupProfileConfirmState, GroupParticipant } from './GroupProfileTypes';

type GroupProfileView = 'details' | 'participants' | 'photos' | 'audios' | 'files';
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
  actionColumns: number;
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
}

const GroupProfileDialogShell: React.FC<Props> = ({
  chatId, canMute, open, isClosing, onOpenChange, currentGroupName, currentGroupAvatar, actionColumns,
  canShowPhotosAction, canShowAudiosAction, canShowFilesAction = false, activeView, panelTransition, onSelectView, renderPanelContent,
  groupConfirm, onCloseGroupConfirm, isAvatarViewerOpen, setIsAvatarViewerOpen, subPage = null,
}) => {
  const { translations: rawTranslations } = useLanguage();
  const translations = rawTranslations as unknown as GroupTranslations;
  const requestClose = () => onOpenChange(false);
  const hasCustomAvatar = !!currentGroupAvatar && currentGroupAvatar !== getAvatarSrc(DEFAULT_GROUP_AVATAR);
  const visibleViews: GroupProfileView[] = ['details', 'participants', ...(canShowPhotosAction ? ['photos' as const] : []), ...(canShowAudiosAction ? ['audios' as const] : []),
    ...(canShowFilesAction ? ['files' as const] : [])];
  const actionButton = (view: GroupProfileView, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      data-profile-tab={view}
      onClick={() => onSelectView(view)}
      className={`relative isolate flex min-h-12 flex-col items-center justify-center gap-1 rounded-md text-sm transition-colors ${
        activeView === view ? 'text-primary' : 'text-subtle-foreground [@media(hover:hover)]:hover:bg-accent'
      }`}
    >

      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );


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
        <div data-profile-swipe className="flex h-full min-h-0 w-full flex-col bg-background text-foreground" inert={!!subPage}>
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-base font-semibold">{translations.groupProfile || 'Group profile'}</h2>
            </div>
            <button
              onClick={requestClose}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden overscroll-contain">
            <div className="flex h-full min-h-0 flex-col">
              <div className="px-5 pb-3 pt-5 text-center md:pt-4">
                {hasCustomAvatar ? (
                  <button
                    type="button"
                    onClick={() => setIsAvatarViewerOpen(true)}
                    className="mx-auto block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label="View group picture"
                  >
                    <AuthenticatedImage
                      src={currentGroupAvatar}
                      alt={currentGroupName}
                      className="h-24 w-24 rounded-full border border-border object-cover shadow-sm transition-opacity hover:opacity-90 md:h-20 md:w-20"
                    />
                  </button>
                ) : (
                  <AuthenticatedImage
                    src={currentGroupAvatar}
                    alt={currentGroupName}
                    className="mx-auto h-24 w-24 rounded-full border border-border object-cover shadow-sm md:h-20 md:w-20"
                  />
                )}
                <h3 className="mt-3 break-words text-xl font-semibold leading-tight text-foreground">{currentGroupName}</h3>
              </div>

              <div
                className="relative isolate grid gap-2 border-y border-border px-4 py-3"
                style={{ gridTemplateColumns: `repeat(${actionColumns}, minmax(0, 1fr))` }}
              >
                <ProfileTabHighlight active={activeView} layoutKey={`${actionColumns}:${visibleViews.join(',')}:${canMute}`} />
                {actionButton('details', <Users className="h-5 w-5" />, translations.info || 'Info')}
                {actionButton('participants', <UserPlus className="h-5 w-5" />, translations.participants || 'Participants')}
                {canShowPhotosAction && actionButton('photos', <ImageIcon className="h-5 w-5" />, translations.photos || 'Photos')}
                {canShowAudiosAction && actionButton('audios', <Music className="h-5 w-5" />, translations.audios || 'Audios')}
                {canShowFilesAction && actionButton('files', <FileText className="h-5 w-5" />, translations.chatFilesTab || 'Files')}
                {canMute && (
                  <ChatMuteAction
                    chatId={chatId}
                    className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-md text-sm transition-colors hover:bg-accent disabled:opacity-50"
                  />
                )}
              </div>

              <SwipeProfilePanels active={activeView} views={visibleViews} onSelect={onSelectView}
                renderPanel={renderPanelContent} enabled={open && !isClosing && !panelTransition && !groupConfirm && !isAvatarViewerOpen && !subPage} />
            </div>
          </div>
        </div>
        {subPage}
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
