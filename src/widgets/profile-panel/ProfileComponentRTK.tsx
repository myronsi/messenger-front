import { ModalSurface } from '@/shared/ui/ModalSurface';
import { mobileWindowSlide } from '@/shared/ui/windowMotion';
import React, { forwardRef, useCallback, useRef, useState, type ReactNode } from 'react';
import type { SettingsPage } from '@/shared/lib/urlOverlay';
import PrivacySettingsPanel from './ui/PrivacySettingsDialog';
import BlockedUsersSection from './ui/BlockedUsersSection';
import NotificationSettingsPanel from './ui/NotificationSettingsPanel';
import SecuritySettingsPanel from './ui/SecuritySettingsDialog';
import ApprovalRequestsPage from './ui/ApprovalRequestsPage';
import PersonalInfoPage from './ui/PersonalInfoPage';
import LanguageSettingsPage from './ui/LanguageSettingsPage';
import AboutPage from './ui/AboutPage';
import { SettingsSectionNav, type SettingsSection } from './ui/SettingsSectionNav';
import { LANGUAGE_NAMES } from './languageNames';
import { ArrowLeft, Bell, Globe, Inbox, Info, Loader2, Shield, Smartphone, UserRound, X } from 'lucide-react';
import ProfileHomePage from './ui/ProfileHomePage';
import ProfilePanelDialogs from './ui/ProfilePanelDialogs';
import type { ProfileSettingsRow } from './ui/ProfileSettingsRows';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { useGetCurrentUserQuery } from '@/features/profile';
import { useProfileAccountActions } from './useProfileAccountActions';
import { useProfilePanelData } from './useProfilePanelData';
import { SettingsLayoutContext, type SettingsLayout } from './model/settingsLayout';

interface ProfileComponentRTKProps {
  username: string;
  onClose: () => void;
  onLogout: () => void;
  isClosing?: boolean;
  layout?: SettingsLayout;
}

const ProfileComponentRTK = forwardRef<HTMLDivElement, ProfileComponentRTKProps>(({
  onClose, onLogout, isClosing = false, layout = 'sheet',
}, ref) => {
  const dismissBlockedRef = useRef(false);
  const [dismissBlocked, setDismissBlocked] = useState(false);
  const onDismissSafetyChange = useCallback((blocked: boolean) => {
    dismissBlockedRef.current = blocked;
    setDismissBlocked(blocked);
  }, []);
  const safeClose = () => { if (!dismissBlockedRef.current) onClose(); };
  const { data: userData, error: userError, isLoading: isLoadingUser, refetch: refetchCurrentUser } = useGetCurrentUserQuery();
  const { translations, language, setLanguage } = useLanguage();
  const t = translations.appShell;
  const {
    avatarFile, setAvatarFile, avatarCropUrl, setAvatarCropUrl, isUploading, bio, newBio, setNewBio,
    displayName, newDisplayName, setNewDisplayName, isUpdatingBio, isUpdatingDisplayName, isAvatarViewerOpen, setIsAvatarViewerOpen, isVisible,
    modal, setModal, isLoggingOut, isDeletingAccount, handleAvatarUpload, handleAvatarDelete, handleUpdateBio,
    handleUpdateDisplayName, handleSavePersonalInfo, discardPersonalInfo, handleLogout, handleDeleteAccount, handleClose, displayNameChanged,
    displayNameInvalid,
  } = useProfileAccountActions({ userData, refetchCurrentUser, onClose: safeClose, onLogout });
  const [avatarStart, setAvatarStart] = useState(0);
  const openAvatar = (index: number) => {
    setAvatarStart(index);
    setIsAvatarViewerOpen(true);
  };
  const pickAvatar = (file: File) => {
    setAvatarFile(file);
    setAvatarCropUrl(URL.createObjectURL(file));
  };
  const panelData = useProfilePanelData({ setModal });
  const {
    activeProfilePage, setActiveProfilePage, blockedUsers, requestInbox, pendingRequestCount, isApprovingRequest, isRejectingRequest,
    isUnblockingUser, handleUnblockUser, handleApproveRequest, handleRejectRequest, getProfileAvatarUrl, getProfileMediaUrl,
  } = panelData;
  const shown = isVisible && !isClosing;
  const pane = layout === 'pane';
  const closeSafely = () => { if (!dismissBlockedRef.current) handleClose(); };
  const frame = (content: ReactNode) => (pane
    ? <div role="region" aria-label={t.settings} className="absolute inset-0 z-50 flex items-center justify-center bg-white p-4">{content}</div>
    : <ModalSurface label="Profile" className="fixed inset-0 z-[1000] flex items-center justify-center bg-white p-4 sm:bg-white/80 sm:backdrop-blur-sm">{content}</ModalSurface>);

  if (isLoadingUser) return frame(<div className="flex items-center gap-2"><Loader2 className="h-6 w-6 animate-spin" /><span>{translations.loading}</span></div>);
  if (userError || !userData) {
    return frame(
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-lg">
        <p className="mb-4 text-red-500">Failed to load profile</p>
        <button type="button" onClick={onClose} className="rounded-md bg-gray-500 px-4 py-2 text-white transition-colors hover:bg-gray-600">Close</button>
      </div>,
    );
  }

  const avatarUrl = getProfileAvatarUrl(userData.avatar_url);
  const hasCustomAvatar = avatarUrl !== DEFAULT_AVATAR;
  const sections: SettingsSection[] = [
    { page: 'personal', label: translations.profile || 'Profile', icon: UserRound },
    { page: 'requests', label: t.messageRequests, icon: Inbox, badge: pendingRequestCount },
    { page: 'privacy', label: translations.privacy || 'Privacy', icon: Shield },
    { page: 'security', label: translations.securityDevices || 'Security & devices', icon: Smartphone },
    { page: 'notifications', label: translations.notifications, icon: Bell },
    { page: 'language', label: translations.language || 'Language', icon: Globe, hint: LANGUAGE_NAMES[language] },
    { page: 'about', label: t.aboutHelp, icon: Info },
  ];
  const toRow = (section: SettingsSection): ProfileSettingsRow => ({
    label: section.label, description: section.hint ?? '', icon: section.icon, indicatorCount: section.badge, onClick: () => setActiveProfilePage(section.page),
  });
  const pick = (...pages: SettingsPage[]) => sections.filter((section) => pages.includes(section.page)).map(toRow);
  const homeSections = [pendingRequestCount > 0 ? pick('requests') : [], pick('privacy', 'security', 'notifications', 'language'), pick('about')]
    .filter((rows) => rows.length > 0);
  const current: SettingsPage = pane && activeProfilePage === 'profile' ? 'personal' : activeProfilePage;
  const back = () => setActiveProfilePage('profile');
  const slot = (page: SettingsPage, node: ReactNode) => {
    const active = current === page;
    const motion = pane ? (active ? '' : 'hidden') : `motion-window-slide ${active ? 'pointer-events-auto translate-x-0' : 'pointer-events-none translate-x-full'}`;
    return <div key={page} aria-hidden={!active} inert={!active} className={`absolute inset-0 bg-white ${motion}`}>{node}</div>;
  };

  const pages = [
    slot('requests', <ApprovalRequestsPage inbox={requestInbox} pendingCount={pendingRequestCount} isApproving={isApprovingRequest} isRejecting={isRejectingRequest}
      onApprove={handleApproveRequest} onReject={handleRejectRequest} onBack={back} getMediaUrl={getProfileMediaUrl} />),
    slot('language', <LanguageSettingsPage language={language} onChange={(next) => { setLanguage(next); window.location.reload(); }} onBack={back} />),
    slot('personal', <PersonalInfoPage avatarUrl={avatarUrl} displayName={displayName} isUploadingAvatar={isUploading} onPickAvatar={pickAvatar}
      newDisplayName={newDisplayName} displayNameChanged={displayNameChanged} displayNameInvalid={displayNameInvalid}
      isUpdatingDisplayName={isUpdatingDisplayName}
      onDisplayNameChange={setNewDisplayName} onSaveDisplayName={handleUpdateDisplayName} bio={bio} newBio={newBio} isUpdatingBio={isUpdatingBio}
      onBioChange={setNewBio} onSaveBio={handleUpdateBio} onSaveAll={handleSavePersonalInfo} onDiscard={discardPersonalInfo} onBack={back}
      username={userData.username} createdAt={userData.created_at} hasCustomAvatar={hasCustomAvatar}
      onOpenAvatar={openAvatar} />),
    slot('privacy', <PrivacySettingsPanel isActive={current === 'privacy'} detail={panelData.privacyDetail} showExceptions={panelData.privacyExceptions}
      onOpenDetail={panelData.openPrivacyDetail} onBack={back}>
      <BlockedUsersSection blockedUsers={blockedUsers} handleUnblockUser={handleUnblockUser} isUnblockingUser={isUnblockingUser} />
    </PrivacySettingsPanel>),
    slot('notifications', <NotificationSettingsPanel isActive={current === 'notifications'} onBack={back} />),
    slot('security', <SecuritySettingsPanel isActive={current === 'security'} detail={panelData.securityDetail}
      onOpenDetail={(detail) => { if (!dismissBlockedRef.current) panelData.openSecurityDetail(detail); }}
      onBack={() => { if (!dismissBlockedRef.current) back(); }} onLoggedOut={onLogout} onDismissSafetyChange={onDismissSafetyChange}
      onDeleteAccount={handleDeleteAccount} isDeletingAccount={isDeletingAccount} />),
    slot('about', <AboutPage onBack={back} />),
  ];
  const dialogs = (
    <ProfilePanelDialogs userData={userData} displayName={displayName} avatarUrl={avatarUrl} hasCustomAvatar={hasCustomAvatar}
      modal={modal} onCancel={() => setModal(null)} setModal={setModal} translations={translations}
      avatarFile={avatarFile} avatarCropUrl={avatarCropUrl} isUploading={isUploading} onAvatarUpload={handleAvatarUpload}
      onCancelAvatarCrop={() => {
        if (!avatarCropUrl) return;
        URL.revokeObjectURL(avatarCropUrl);
        setAvatarCropUrl(null);
        setAvatarFile(null);
      }}
      isAvatarViewerOpen={isAvatarViewerOpen} avatarViewerIndex={avatarStart} onCloseAvatarViewer={() => setIsAvatarViewerOpen(false)}
      onDeleteAvatar={handleAvatarDelete} />
  );

  if (pane) {
    return (
      <SettingsLayoutContext.Provider value="pane">
        <div ref={ref} role="region" aria-label={t.settings}
          onKeyDown={(event) => { if (event.key === 'Escape' && !event.defaultPrevented) closeSafely(); }}
          className={`motion-sheet-in absolute inset-0 z-50 flex bg-white transition-opacity duration-200 ${shown ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
          <SettingsSectionNav avatarUrl={avatarUrl} displayName={displayName} username={userData.username} sections={sections} active={current}
            onSelect={setActiveProfilePage} onLogout={handleLogout} isLoggingOut={isLoggingOut} />
          <div className="relative min-w-0 flex-1">
            {pages}
            <button type="button" onClick={closeSafely} disabled={dismissBlocked} aria-label={t.closeSettings} title={t.closeSettings}
              className="absolute right-4 top-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900">
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>
          {dialogs}
        </div>
      </SettingsLayoutContext.Provider>
    );
  }

  return (
    <SettingsLayoutContext.Provider value="sheet">
      <ModalSurface label="Profile"
        onPointerDown={(event) => { if (event.target === event.currentTarget) closeSafely(); }}
        className={`fixed inset-0 z-[1000] flex items-stretch justify-stretch bg-transparent p-0 sm:items-center sm:justify-center sm:bg-black/40 sm:px-4 sm:py-6 sm:transition-opacity sm:duration-200 ${shown ? 'sm:opacity-100' : 'pointer-events-none sm:opacity-0'}`}
      >
        <div ref={ref}
          className={`relative flex h-[100dvh] w-full max-w-none transform flex-col overflow-hidden border-0 bg-white text-gray-950 shadow-none sm:h-[min(760px,calc(100vh-3rem))] sm:max-w-xl sm:rounded-lg sm:border sm:border-gray-200 sm:shadow-2xl sm:transition-all sm:duration-200 sm:ease-out ${mobileWindowSlide(shown)} ${shown ? 'sm:translate-y-0 sm:scale-100 sm:opacity-100' : 'sm:translate-y-2 sm:scale-95 sm:opacity-0'}`}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {current === 'profile' && <div className="flex h-14 shrink-0 items-center gap-1 border-b border-gray-200 px-2">
            <button type="button" onClick={closeSafely} disabled={dismissBlocked} aria-label={t.backToChats} title={t.backToChats}
              className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold">{t.settings}</h2>
          </div>}
          <div className="relative min-h-0 flex-1 overflow-hidden supports-[overflow:clip]:overflow-clip">
            <div aria-hidden={current !== 'profile'} inert={current !== 'profile'}
              className={`absolute inset-0 overflow-y-auto bg-slate-50 motion-window-slide ${current === 'profile' ? 'pointer-events-auto translate-x-0' : 'pointer-events-none -translate-x-full'}`}>
              <ProfileHomePage username={userData.username} avatarUrl={avatarUrl} hasCustomAvatar={hasCustomAvatar} displayName={displayName} bio={bio}
                isUploadingAvatar={isUploading} onPickAvatar={pickAvatar} onOpenAvatar={openAvatar} onEditProfile={() => setActiveProfilePage('personal')}
                sections={homeSections} handleLogout={handleLogout} isLoggingOut={isLoggingOut} />
            </div>
            {pages}
          </div>
        </div>
        {dialogs}
      </ModalSurface>
    </SettingsLayoutContext.Provider>
  );
});

ProfileComponentRTK.displayName = 'ProfileComponentRTK';

export default ProfileComponentRTK;
