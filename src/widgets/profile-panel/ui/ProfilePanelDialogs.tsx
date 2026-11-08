import AvatarCropModal from '@/shared/ui/AvatarCropModal';
import { isGoApi } from '@/shared/api/goSocket';
import AvatarHistoryViewer from './AvatarHistoryViewer';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import type { en } from '@/shared/lang/en';
import type { User } from '@/entities/user';
import type { EntityId } from '@/shared/api/entityId';
import type { ProfileModalState } from '../useProfileAccountActions';

interface ProfilePanelDialogsProps {
  userData: Pick<User, 'username'>;
  displayName: string;
  avatarUrl: string;
  hasCustomAvatar: boolean;
  modal: ProfileModalState | null;
  onCancel: () => void;
  setModal: (modal: ProfileModalState | null) => void;
  translations: typeof en;
  avatarFile: File | null;
  avatarCropUrl: string | null;
  isUploading: boolean;
  onAvatarUpload: (file: File) => void;
  onCancelAvatarCrop: () => void;
  isAvatarViewerOpen: boolean;
  avatarViewerIndex?: number;
  onCloseAvatarViewer: () => void;
  onDeleteAvatar: (id: EntityId) => Promise<void>;
}

const ProfilePanelDialogs = ({
  userData,
  displayName,
  avatarUrl,
  hasCustomAvatar,
  modal,
  onCancel,
  setModal,
  translations,
  avatarFile,
  avatarCropUrl,
  isUploading,
  onAvatarUpload,
  onCancelAvatarCrop,
  isAvatarViewerOpen,
  avatarViewerIndex = 0,
  onCloseAvatarViewer,
  onDeleteAvatar,
}: ProfilePanelDialogsProps) => (
  <>
    {modal && (
      <ConfirmModal
        title={
          modal.type === 'success'
            ? translations.success
            : modal.type === 'logout'
              ? translations.logout
              : modal.type === 'deleteAccount'
                ? translations.deleteAccount
                : translations.error
        }
        message={modal.message}
        requirePassword={modal.type === 'deleteAccount' && isGoApi()}
        consequences={modal.consequences}
        onConfirm={modal.onConfirm || (() => setModal(null))}
        onCancel={onCancel}
        confirmText={
          modal.type === 'success' || modal.type === 'error'
            ? 'OK'
            : translations.confirm
        }
        isError={modal.type === 'error'}
        isDestructive={modal.type === 'deleteAccount'}
      />
    )}
    {avatarFile && avatarCropUrl && (
      <AvatarCropModal
        file={avatarFile}
        imageUrl={avatarCropUrl}
        isUploading={isUploading}
        onConfirm={onAvatarUpload}
        onCancel={onCancelAvatarCrop}
      />
    )}
    {isAvatarViewerOpen && hasCustomAvatar && (
      <AvatarHistoryViewer
        username={userData.username}
        displayName={displayName}
        currentAvatarUrl={avatarUrl}
        initialIndex={avatarViewerIndex}
        onClose={onCloseAvatarViewer}
        onDeleteAvatar={onDeleteAvatar}
      />
    )}
  </>
);

export default ProfilePanelDialogs;
