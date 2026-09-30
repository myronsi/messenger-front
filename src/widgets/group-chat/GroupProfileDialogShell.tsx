import React from 'react';
import { Image as ImageIcon, Music, Search, UserPlus, Users, X } from 'lucide-react';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { GroupTranslations } from './groupChatTypes';
import GroupAvatarViewer from './GroupAvatarViewer';
import type { GroupProfileConfirmState, GroupParticipant } from './GroupProfileTypes';

type GroupProfileView = 'details' | 'participants' | 'search' | 'photos' | 'audios';
type GroupProfileTransition = { from: GroupProfileView; to: GroupProfileView; direction: 'forward' | 'back'; key: number; };
interface Props { open: boolean; isClosing: boolean; onOpenChange: (open: boolean) => void; currentGroupName: string; currentGroupAvatar: string; participants: GroupParticipant[]; actionColumns: number; canShowPhotosAction: boolean; canShowAudiosAction: boolean; activeView: GroupProfileView; panelTransition: GroupProfileTransition | null; onSelectView: (view: GroupProfileView) => void; renderPanelContent: (view: GroupProfileView, options?: { autoFocusSearch?: boolean }) => React.ReactNode; groupConfirm: GroupProfileConfirmState | null; onCloseGroupConfirm: () => void; isAvatarViewerOpen: boolean; setIsAvatarViewerOpen: React.Dispatch<React.SetStateAction<boolean>>; }

const GroupProfileDialogShell: React.FC<Props> = ({ open, isClosing, onOpenChange, currentGroupName, currentGroupAvatar, participants, actionColumns, canShowPhotosAction, canShowAudiosAction, activeView, panelTransition, onSelectView, renderPanelContent, groupConfirm, onCloseGroupConfirm, isAvatarViewerOpen, setIsAvatarViewerOpen }) => {
  const { translations: rawTranslations } = useLanguage();
  const translations = rawTranslations as unknown as GroupTranslations;
  const requestClose = () => onOpenChange(false);
  const actionButton = (view: GroupProfileView, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      onClick={() => onSelectView(view)}
      className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-md text-sm transition-colors ${
        activeView === view ? 'bg-gray-100 text-primary' : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );


  if (!open) return null;


  return (
    <div
      className={`fixed inset-0 z-[1000] flex items-center justify-center bg-white px-0 py-0 transition-opacity duration-200 ease-out sm:bg-black/40 sm:px-6 sm:py-6 ${
        isClosing ? 'opacity-95 sm:opacity-0' : 'opacity-100'
      }`}
      onMouseDown={requestClose}
    >
      <div
        className={`relative h-full w-full max-w-full overflow-hidden bg-white shadow-2xl transition-all duration-200 ease-out sm:h-[min(780px,calc(100vh-3rem))] sm:w-[420px] sm:rounded-lg ${
          isClosing
            ? 'translate-x-full opacity-95 sm:translate-x-0 sm:translate-y-3 sm:scale-95 sm:opacity-0'
            : 'translate-x-0 opacity-100 sm:translate-y-0 sm:scale-100'
        }`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex h-full min-h-0 w-full flex-col bg-white text-gray-950">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 px-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-500" />
              <h2 className="text-base font-semibold">{translations.groupProfile || 'Group profile'}</h2>
            </div>
            <button
              onClick={requestClose}
              className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden overscroll-contain">
            <div className="flex h-full min-h-0 flex-col">
              <div className="px-5 pb-3 pt-5 text-center md:pt-4">
                <button
                  type="button"
                  onClick={() => setIsAvatarViewerOpen(true)}
                  className="mx-auto block rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="View group picture"
                >
                  <img
                    src={currentGroupAvatar}
                    alt={currentGroupName}
                    className="h-24 w-24 rounded-full border border-gray-200 object-cover shadow-sm transition-opacity hover:opacity-90 md:h-20 md:w-20"
                  />
                </button>
                <h3 className="mt-3 break-words text-xl font-semibold leading-tight text-gray-950">{currentGroupName}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {participants.length} {translations.participants || 'participants'}
                </p>
              </div>

              <div
                className="grid gap-2 border-y border-gray-200 px-4 py-3"
                style={{ gridTemplateColumns: `repeat(${actionColumns}, minmax(0, 1fr))` }}
              >
                {actionButton('details', <Users className="h-5 w-5" />, translations.info || 'Info')}
                {actionButton('participants', <UserPlus className="h-5 w-5" />, translations.participants || 'Participants')}
                {actionButton('search', <Search className="h-5 w-5" />, translations.search || 'Search')}
                {canShowPhotosAction && actionButton('photos', <ImageIcon className="h-5 w-5" />, translations.photos || 'Photos')}
                {canShowAudiosAction && actionButton('audios', <Music className="h-5 w-5" />, translations.audios || 'Audios')}
              </div>

              <div className="relative min-h-0 flex-1 overflow-hidden bg-white">
                {panelTransition ? (
                  <>
                    <div
                      key={`from-${panelTransition.key}-${panelTransition.from}`}
                      aria-hidden
                      inert
                      className={`absolute inset-0 overflow-y-auto bg-white ${
                        panelTransition.direction === 'forward'
                          ? 'profile-panel-slide-out-left'
                          : 'profile-panel-slide-out-right'
                      }`}
                    >
                      {renderPanelContent(panelTransition.from, { autoFocusSearch: false })}
                    </div>
                    <div
                      key={`to-${panelTransition.key}-${panelTransition.to}`}
                      className={`absolute inset-0 overflow-y-auto bg-white ${
                        panelTransition.direction === 'forward'
                          ? 'profile-panel-slide-in-right'
                          : 'profile-panel-slide-in-left'
                      }`}
                    >
                      {renderPanelContent(panelTransition.to, { autoFocusSearch: false })}
                    </div>
                  </>
                ) : (
                  <div key={`active-${activeView}`} className="absolute inset-0 overflow-y-auto bg-white">
                    {renderPanelContent(activeView, { autoFocusSearch: activeView === 'search' })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
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
        {isAvatarViewerOpen && (
          <GroupAvatarViewer
            avatarUrl={currentGroupAvatar}
            groupName={currentGroupName}
            onClose={() => setIsAvatarViewerOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default GroupProfileDialogShell;
