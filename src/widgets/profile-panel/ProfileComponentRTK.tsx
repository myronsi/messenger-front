import React, { forwardRef } from 'react';
import PrivacySettingsPanel from './ui/PrivacySettingsDialog';
import SecuritySettingsPanel from './ui/SecuritySettingsDialog';
import ApprovalRequestsPage from './ui/ApprovalRequestsPage';
import PersonalInfoPage from './ui/PersonalInfoPage';
import { Bell, Inbox, Loader2, Shield, Smartphone, UserRound, Users, X } from 'lucide-react';
import ProfileHomePage from './ui/ProfileHomePage';
import ProfilePanelDialogs from './ui/ProfilePanelDialogs';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { useGetCurrentUserQuery } from '@/features/profile';
import { useProfileAccountActions } from './useProfileAccountActions';
import { useProfilePanelData } from './useProfilePanelData';
import { useCreateGroupFromProfile } from './useCreateGroupFromProfile';
interface ProfileComponentRTKProps {
  username: string;
  onClose: () => void;
  onLogout: () => void;
}

const ProfileComponentRTK = forwardRef<HTMLDivElement, ProfileComponentRTKProps>(({ 
  username, 
  onClose, 
  onLogout 
}, ref) => {
  // RTK Query hooks
  const { 
    data: userData, 
    error: userError, 
    isLoading: isLoadingUser,
    refetch: refetchCurrentUser,
  } = useGetCurrentUserQuery();
  
  const { translations, language, setLanguage } = useLanguage();
  const {
    avatarFile, setAvatarFile, avatarCropUrl, setAvatarCropUrl, isUploading, bio, newBio, setNewBio,
    displayName, newDisplayName, setNewDisplayName, isUpdatingBio, isUpdatingDisplayName,
    isGroupModalOpen, setIsGroupModalOpen, isAvatarViewerOpen, setIsAvatarViewerOpen, isVisible,
    modal, setModal, isLoggingOut, isDeletingAccount, handleAvatarUpload, handleUpdateBio,
    handleUpdateDisplayName, handleLogout, handleDeleteAccount, handleClose, displayNameChanged,
    displayNameInvalid,
  } = useProfileAccountActions({ userData, refetchCurrentUser, onClose, onLogout });
  const handleCreateGroup = useCreateGroupFromProfile({ setIsGroupModalOpen, setModal });
  const panelData = useProfilePanelData({ username: userData?.username || username, setModal });
  const {
    activeProfilePage, setActiveProfilePage, blockUsername, setBlockUsername, pendingBlockUsername,
    setPendingBlockUsername, isBlockDmContactsCollapsed, setIsBlockDmContactsCollapsed, blockedUsers,
    blockDmContactSuggestions, requestInbox, pendingRequestCount, isApprovingRequest, isRejectingRequest,
    isBlockingUser, isUnblockingUser, handleBlockUser, handleUnblockUser, handleApproveRequest,
    handleRejectRequest, getProfileAvatarUrl, getProfileMediaUrl,
  } = panelData;
  const handleBlockUserConfirmed = panelData.confirmBlockUser;
  const getAvatarUrl = getProfileAvatarUrl;
  const getMediaUrl = getProfileMediaUrl;

  if (isLoadingUser) {
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-white sm:bg-white/80 sm:backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>{translations.loading}</span>
        </div>
      </div>
    );
  }

  if (userError || !userData) {
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-white p-4 sm:bg-white/80 sm:backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-lg">
          <p className="text-red-500 mb-4">Failed to load profile</p>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const avatarUrl = getAvatarUrl(userData?.avatar_url);
  const hasCustomAvatar = avatarUrl !== DEFAULT_AVATAR;
  const settingsRows = [
    ...(pendingRequestCount > 0 ? [{
      label: translations.requestInbox || 'Request inbox',
      description: `${pendingRequestCount} ${translations.pendingRequests || 'pending requests'}`,
      icon: Inbox,
      indicatorCount: pendingRequestCount,
      onClick: () => setActiveProfilePage('requests' as const),
    }] : []),
    {
      label: translations.personalInfo || 'Personal info',
      description: translations.editProfile || 'Edit how other people see you.',
      icon: UserRound,
      indicatorCount: 0,
      onClick: () => setActiveProfilePage('personal'),
    },
    {
      label: translations.privacy || 'Privacy',
      description: translations.privacyDescription || 'Control who can see and contact you.',
      icon: Shield,
      indicatorCount: 0,
      onClick: () => setActiveProfilePage('privacy'),
    },
    {
      label: translations.securityDevices || 'Security & devices',
      description: translations.manageSessionsAndPassword || 'Sessions, password, and two-factor authentication',
      icon: Smartphone,
      indicatorCount: 0,
      onClick: () => setActiveProfilePage('security'),
    },
  ];
  const futureSettingsRows = [
    { label: translations.notifications || 'Notifications', description: translations.comingSoon || 'Coming soon', icon: Bell },
  ];
  return (
    <div
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className={`fixed inset-0 z-[1000] flex items-stretch justify-stretch bg-white p-0 transition-opacity duration-200 sm:items-center sm:justify-center sm:bg-black/40 sm:px-4 sm:py-6 ${isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
    >
      <div
        ref={ref}
        className={`relative flex h-[100dvh] w-full max-w-none transform flex-col overflow-hidden border-0 bg-white text-gray-950 shadow-none transition-all duration-200 ease-out sm:h-[min(760px,calc(100vh-3rem))] sm:max-w-xl sm:rounded-lg sm:border sm:border-gray-200 sm:shadow-2xl ${isVisible ? 'translate-x-0 scale-100 opacity-100 sm:translate-y-0' : 'translate-x-full opacity-0 sm:translate-x-0 sm:translate-y-2 sm:scale-95'}`}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 px-4">
          <div className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-gray-500" />
            <h2 className="text-base font-semibold">{translations.profile}</h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div
            aria-hidden={activeProfilePage !== 'profile'}
            inert={activeProfilePage !== 'profile' ? true : undefined}
            className={`absolute inset-0 overflow-y-auto bg-white transition-transform duration-300 ease-out will-change-transform ${activeProfilePage === 'profile' ? 'pointer-events-auto translate-x-0' : 'pointer-events-none -translate-x-full'}`}
          >
            <ProfileHomePage
              username={username} userData={userData} avatarUrl={avatarUrl} hasCustomAvatar={hasCustomAvatar}
              displayName={displayName} bio={bio} language={language} setLanguage={setLanguage}
              setIsAvatarViewerOpen={setIsAvatarViewerOpen} setIsGroupModalOpen={setIsGroupModalOpen}
              setAvatarFile={setAvatarFile} setAvatarCropUrl={setAvatarCropUrl}
              settingsRows={settingsRows} futureSettingsRows={futureSettingsRows}
              blockUsername={blockUsername} setBlockUsername={setBlockUsername} handleBlockUser={handleBlockUser}
              isBlockingUser={isBlockingUser} isBlockDmContactsCollapsed={isBlockDmContactsCollapsed}
              setIsBlockDmContactsCollapsed={setIsBlockDmContactsCollapsed} blockDmContactSuggestions={blockDmContactSuggestions}
              getAvatarUrl={getAvatarUrl} blockedUsers={blockedUsers} handleUnblockUser={handleUnblockUser}
              isUnblockingUser={isUnblockingUser} handleLogout={handleLogout} isLoggingOut={isLoggingOut}
              handleDeleteAccount={handleDeleteAccount} isDeletingAccount={isDeletingAccount}
            />
          </div>

          <div aria-hidden={activeProfilePage !== 'requests'} inert={activeProfilePage !== 'requests' ? true : undefined} className={`absolute inset-0 transition-transform duration-300 ease-out will-change-transform ${activeProfilePage === 'requests' ? 'pointer-events-auto translate-x-0' : 'pointer-events-none translate-x-full'}`}>
            <ApprovalRequestsPage inbox={requestInbox} pendingCount={pendingRequestCount} isApproving={isApprovingRequest} isRejecting={isRejectingRequest} onApprove={handleApproveRequest} onReject={handleRejectRequest} onBack={() => setActiveProfilePage('profile')} getMediaUrl={getMediaUrl} />
          </div>

          <div aria-hidden={activeProfilePage !== 'personal'} inert={activeProfilePage !== 'personal' ? true : undefined} className={`absolute inset-0 transition-transform duration-300 ease-out will-change-transform ${activeProfilePage === 'personal' ? 'pointer-events-auto translate-x-0' : 'pointer-events-none translate-x-full'}`}>
            <PersonalInfoPage newDisplayName={newDisplayName} displayNameChanged={displayNameChanged} displayNameInvalid={displayNameInvalid} isUpdatingDisplayName={isUpdatingDisplayName} onDisplayNameChange={setNewDisplayName} onSaveDisplayName={handleUpdateDisplayName} bio={bio} newBio={newBio} isUpdatingBio={isUpdatingBio} onBioChange={setNewBio} onSaveBio={handleUpdateBio} onBack={() => setActiveProfilePage('profile')} />
          </div>

          <div
            aria-hidden={activeProfilePage !== 'privacy'}
            inert={activeProfilePage !== 'privacy' ? true : undefined}
            className={`absolute inset-0 transition-transform duration-300 ease-out will-change-transform ${
              activeProfilePage === 'privacy' ? 'pointer-events-auto translate-x-0' : 'pointer-events-none translate-x-full'
            }`}
          >
            <PrivacySettingsPanel
              isActive={activeProfilePage === 'privacy'}
              onBack={() => setActiveProfilePage('profile')}
            />
          </div>

          <div
            aria-hidden={activeProfilePage !== 'security'}
            inert={activeProfilePage !== 'security' ? true : undefined}
            className={`absolute inset-0 transition-transform duration-300 ease-out will-change-transform ${
              activeProfilePage === 'security' ? 'pointer-events-auto translate-x-0' : 'pointer-events-none translate-x-full'
            }`}
          >
            <SecuritySettingsPanel
              isActive={activeProfilePage === 'security'}
              onBack={() => setActiveProfilePage('profile')}
              onLoggedOut={onLogout}
            />
          </div>
        </div>
      </div>

      <ProfilePanelDialogs
        username={username}
        userData={userData}
        displayName={displayName}
        avatarUrl={avatarUrl}
        hasCustomAvatar={hasCustomAvatar}
        isGroupModalOpen={isGroupModalOpen}
        onCloseGroupModal={() => setIsGroupModalOpen(false)}
        onCreateGroup={handleCreateGroup}
        modal={modal}
        pendingBlockUsername={pendingBlockUsername}
        onConfirmBlock={handleBlockUserConfirmed}
        onCancel={() => {
          if (modal?.type === 'blockUser') setPendingBlockUsername('');
          setModal(null);
        }}
        setModal={setModal}
        translations={translations}
        avatarFile={avatarFile}
        avatarCropUrl={avatarCropUrl}
        isUploading={isUploading}
        onAvatarUpload={handleAvatarUpload}
        onCancelAvatarCrop={() => {
          if (!avatarCropUrl) return;
          URL.revokeObjectURL(avatarCropUrl);
          setAvatarCropUrl(null);
          setAvatarFile(null);
        }}
        isAvatarViewerOpen={isAvatarViewerOpen}
        onCloseAvatarViewer={() => setIsAvatarViewerOpen(false)}
      />

    </div>
  );
});

ProfileComponentRTK.displayName = 'ProfileComponentRTK';

export default ProfileComponentRTK;
