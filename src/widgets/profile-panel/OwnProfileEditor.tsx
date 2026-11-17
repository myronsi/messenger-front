import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { useGetCurrentUserQuery } from '@/features/profile';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useProfileAccountActions } from './useProfileAccountActions';
import { getProfileAvatarUrl } from './useProfilePanelData';
import { useProfileMediaDraft } from './model/useProfileMediaDraft';
import { EditProfilePage } from './ui/EditProfilePage';
import ProfilePanelDialogs from './ui/ProfilePanelDialogs';

interface OwnProfileEditorProps {
  onBack: () => void;
}

export default function OwnProfileEditor({ onBack }: OwnProfileEditorProps) {
  const { translations } = useLanguage();
  const { data: userData, refetch } = useGetCurrentUserQuery();
  const account = useProfileAccountActions({ userData, refetchCurrentUser: refetch, onClose: onBack, onLogout: () => undefined });
  const media = useProfileMediaDraft(userData);
  const [avatarStart, setAvatarStart] = useState(0);

  if (!userData) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const avatarUrl = getProfileAvatarUrl(userData.avatar_url);
  const hasCustomAvatar = avatarUrl !== DEFAULT_AVATAR;
  const hasChanges = account.displayNameChanged || account.newBio !== account.bio || account.extras.changed || media.changed;
  const cancelCrop = () => {
    if (!account.avatarCropUrl) return;
    URL.revokeObjectURL(account.avatarCropUrl);
    account.setAvatarCropUrl(null);
    account.setAvatarFile(null);
  };
  const save = async () => {
    if (!await account.handleSavePersonalInfo()) return false;
    try {
      await media.save();
    } catch {
      account.setModal({ type: 'error', message: translations.profileSaveFailed });
      return false;
    }
    onBack();
    return true;
  };
  const discard = () => {
    account.discardPersonalInfo();
    media.discard();
  };

  return (
    <>
      <EditProfilePage
        username={userData.username} avatarUrl={avatarUrl} hasCustomAvatar={hasCustomAvatar} isUploadingAvatar={account.isUploading}
        onPickAvatar={(file) => { account.setAvatarFile(file); account.setAvatarCropUrl(URL.createObjectURL(file)); }}
        onOpenAvatar={(index) => { setAvatarStart(index); account.setIsAvatarViewerOpen(true); }}
        name={account.newDisplayName} nameInvalid={account.displayNameInvalid} onNameChange={account.setNewDisplayName}
        bio={account.newBio} onBioChange={account.setNewBio} extras={account.extras}
        music={media.music} onMusicChange={media.chooseMusic} background={media.background} onBackgroundChange={media.chooseBackground}
        mediaVersion={media.version} hasChanges={hasChanges} canSave={!account.displayNameInvalid && !account.extras.birthdayInvalid}
        isSaving={account.isSavingPersonalInfo || media.isSaving} onSave={save} onDiscard={discard} onBack={onBack} />
      <ProfilePanelDialogs userData={userData} displayName={account.displayName} avatarUrl={avatarUrl} hasCustomAvatar={hasCustomAvatar}
        modal={account.modal} onCancel={() => account.setModal(null)} setModal={account.setModal} translations={translations}
        avatarFile={account.avatarFile} avatarCropUrl={account.avatarCropUrl} isUploading={account.isUploading} onAvatarUpload={account.handleAvatarUpload}
        onCancelAvatarCrop={cancelCrop} isAvatarViewerOpen={account.isAvatarViewerOpen} avatarViewerIndex={avatarStart}
        onCloseAvatarViewer={() => account.setIsAvatarViewerOpen(false)} onDeleteAvatar={account.handleAvatarDelete} />
    </>
  );
}
