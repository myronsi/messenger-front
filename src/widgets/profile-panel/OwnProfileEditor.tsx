import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { useGetCurrentUserQuery } from '@/features/profile';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useProfileAccountActions } from './useProfileAccountActions';
import { getProfileAvatarUrl } from './useProfilePanelData';
import PersonalInfoPage from './ui/PersonalInfoPage';
import ProfilePanelDialogs from './ui/ProfilePanelDialogs';

interface OwnProfileEditorProps {
  onBack: () => void;
}

export default function OwnProfileEditor({ onBack }: OwnProfileEditorProps) {
  const { translations } = useLanguage();
  const { data: userData, refetch } = useGetCurrentUserQuery();
  const account = useProfileAccountActions({ userData, refetchCurrentUser: refetch, onClose: onBack, onLogout: () => undefined });
  const [avatarStart, setAvatarStart] = useState(0);

  if (!userData) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const avatarUrl = getProfileAvatarUrl(userData.avatar_url);
  const hasCustomAvatar = avatarUrl !== DEFAULT_AVATAR;
  const cancelCrop = () => {
    if (!account.avatarCropUrl) return;
    URL.revokeObjectURL(account.avatarCropUrl);
    account.setAvatarCropUrl(null);
    account.setAvatarFile(null);
  };

  return (
    <>
      <PersonalInfoPage avatarUrl={avatarUrl} displayName={account.displayName} isUploadingAvatar={account.isUploading}
        onPickAvatar={(file) => { account.setAvatarFile(file); account.setAvatarCropUrl(URL.createObjectURL(file)); }}
        newDisplayName={account.newDisplayName} displayNameChanged={account.displayNameChanged} displayNameInvalid={account.displayNameInvalid}
        isSaving={account.isSavingPersonalInfo} onDisplayNameChange={account.setNewDisplayName} bio={account.bio} newBio={account.newBio}
        onBioChange={account.setNewBio} onSaveAll={account.handleSavePersonalInfo} onDiscard={account.discardPersonalInfo} onBack={onBack}
        username={userData.username} createdAt={userData.created_at} hasCustomAvatar={hasCustomAvatar}
        onOpenAvatar={(index) => { setAvatarStart(index); account.setIsAvatarViewerOpen(true); }} />
      <ProfilePanelDialogs userData={userData} displayName={account.displayName} avatarUrl={avatarUrl} hasCustomAvatar={hasCustomAvatar}
        modal={account.modal} onCancel={() => account.setModal(null)} setModal={account.setModal} translations={translations}
        avatarFile={account.avatarFile} avatarCropUrl={account.avatarCropUrl} isUploading={account.isUploading} onAvatarUpload={account.handleAvatarUpload}
        onCancelAvatarCrop={cancelCrop} isAvatarViewerOpen={account.isAvatarViewerOpen} avatarViewerIndex={avatarStart}
        onCloseAvatarViewer={() => account.setIsAvatarViewerOpen(false)} onDeleteAvatar={account.handleAvatarDelete} />
    </>
  );
}
