import AvatarCropModal from '@/shared/ui/AvatarCropModal';
import AvatarHistoryViewer from './AvatarHistoryViewer';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import { GroupCreateModal, type GroupCreatePayload } from '@/features/groups';
import type { en } from '@/shared/lang/en';
import type { User } from '@/entities/user';
import type { ProfileModalState } from '../useProfileAccountActions';

interface ProfilePanelDialogsProps {
  username: string;
  userData: Pick<User, 'username'>;
  displayName: string;
  avatarUrl: string;
  hasCustomAvatar: boolean;
  isGroupModalOpen: boolean;
  onCloseGroupModal: () => void;
  onCreateGroup: (payload: GroupCreatePayload) => Promise<void>;
  modal: ProfileModalState | null;
  pendingBlockUsername: string;
  onConfirmBlock: () => void;
  onCancel: () => void;
  setModal: (modal: ProfileModalState | null) => void;
  translations: typeof en;
  avatarFile: File | null;
  avatarCropUrl: string | null;
  isUploading: boolean;
  onAvatarUpload: (file: File) => void;
  onCancelAvatarCrop: () => void;
  isAvatarViewerOpen: boolean;
  onCloseAvatarViewer: () => void;
}

const ProfilePanelDialogs = ({
  username,
  userData,
  displayName,
  avatarUrl,
  hasCustomAvatar,
  isGroupModalOpen,
  onCloseGroupModal,
  onCreateGroup,
  modal,
  pendingBlockUsername,
  onConfirmBlock,
  onCancel,
  setModal,
  translations,
  avatarFile,
  avatarCropUrl,
  isUploading,
  onAvatarUpload,
  onCancelAvatarCrop,
  isAvatarViewerOpen,
  onCloseAvatarViewer,
}: ProfilePanelDialogsProps) => (
  <>
    {isGroupModalOpen && (
      <GroupCreateModal
        currentUsername={username}
        onClose={onCloseGroupModal}
        onCreate={onCreateGroup}
      />
    )}
    {modal && (
      <ConfirmModal
        title={
          modal.type === 'success'
            ? translations.success
            : modal.type === 'logout'
              ? translations.logout
              : modal.type === 'deleteAccount'
                ? translations.deleteAccount
                : modal.type === 'blockUser'
                  ? translations.blockUserConfirmTitle || `Block ${pendingBlockUsername}?`
                  : translations.error
        }
        message={modal.message}
        consequences={modal.consequences}
        onConfirm={modal.type === 'blockUser' ? onConfirmBlock : modal.onConfirm || (() => setModal(null))}
        onCancel={onCancel}
        confirmText={
          modal.type === 'success' || modal.type === 'error'
            ? 'OK'
            : modal.type === 'blockUser'
              ? translations.block || 'Block'
              : translations.confirm
        }
        isError={modal.type === 'error'}
        isDestructive={modal.type === 'blockUser' || modal.type === 'deleteAccount'}
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
        onClose={onCloseAvatarViewer}
      />
    )}
  </>
);

export default ProfilePanelDialogs;
