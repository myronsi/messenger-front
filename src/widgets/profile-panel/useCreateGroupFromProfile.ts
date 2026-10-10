import { authFetch } from '@/shared/auth/session';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { GroupCreatePayload } from '@/features/groups';
import type { ProfileModalState } from './useProfileAccountActions';
import type { Id } from '@/shared/lib/ids';

const BASE_URL = import.meta.env.VITE_BASE_URL;

interface CreateGroupResponse {
  chat_id?: Id;
  detail?: string;
}

interface CreateGroupOptions {
  setIsGroupModalOpen: (open: boolean) => void;
  setModal: (modal: ProfileModalState | null) => void;
}

export const useCreateGroupFromProfile = ({ setIsGroupModalOpen, setModal }: CreateGroupOptions) => {
  const { translations } = useLanguage();

  return async ({ groupName, description, participants, avatarFile, setRejectedParticipants }: GroupCreatePayload) => {
    const response = await authFetch(`${BASE_URL}/groups/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: groupName, description, participants }),
    });
    if (!response.ok) {
      const data = await response.json() as CreateGroupResponse;
      const detail = data.detail || 'Error creating group';
      const rejected = participants.find((participant) => detail.includes(participant));
      if (rejected) setRejectedParticipants({ [rejected]: detail });
      throw new Error(detail);
    }

    const createdGroup = await response.json() as CreateGroupResponse;
    let avatarWarning = '';
    if (avatarFile && createdGroup.chat_id) {
      const formData = new FormData();
      formData.append('file', avatarFile);
      const avatarResponse = await authFetch(`${BASE_URL}/groups/${createdGroup.chat_id}/avatar`, {
        method: 'POST',
        body: formData,
      });
      if (!avatarResponse.ok) {
        avatarWarning = ` ${translations.avatarUploadFailed || 'Avatar upload failed.'}`;
      }
    }
    setIsGroupModalOpen(false);
    setModal({ type: 'success', message: `${translations.groupCreated}${avatarWarning}` });
  };
};
