import { useCreateGroupMutation, useSetGroupAvatarMutation } from '@/entities/chat';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { apiErrorMessage } from '@/shared/lib/apiError';
import type { GroupCreatePayload } from '@/features/groups';
import type { ProfileModalState } from './useProfileAccountActions';

interface CreateGroupOptions {
  setIsGroupModalOpen: (open: boolean) => void;
  setModal: (modal: ProfileModalState | null) => void;
}

export const useCreateGroupFromProfile = ({ setIsGroupModalOpen, setModal }: CreateGroupOptions) => {
  const { translations } = useLanguage();
  const [createGroup] = useCreateGroupMutation();
  const [setGroupAvatar] = useSetGroupAvatarMutation();

  return async ({ groupName, description, participants, avatarFile, setRejectedParticipants }: GroupCreatePayload) => {
    let group;
    try {
      group = await createGroup({
        name: groupName,
        description,
        members: participants.map((username) => ({ username })),
      }).unwrap();
    } catch (error) {
      const detail = apiErrorMessage(error, 'Error creating group');
      const rejected = participants.find((participant) => detail.includes(participant));
      if (rejected) setRejectedParticipants({ [rejected]: detail });
      throw new Error(detail);
    }

    let avatarWarning = '';
    if (avatarFile) {
      try {
        await setGroupAvatar({ chatId: group.chat_id, file: avatarFile }).unwrap();
      } catch {
        avatarWarning = ` ${translations.avatarUploadFailed || 'Avatar upload failed.'}`;
      }
    }
    setIsGroupModalOpen(false);
    setModal({ type: 'success', message: `${translations.groupCreated}${avatarWarning}` });
  };
};
