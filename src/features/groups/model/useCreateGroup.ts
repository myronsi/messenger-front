import { getApiBaseUrl } from '@/shared/api/config';
import type { EntityId } from '@/shared/api/entityId';
import { authFetch } from '@/shared/auth/session';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { GroupCreatePayload } from './useGroupCreateForm';

const BASE_URL = getApiBaseUrl();

interface CreateGroupResponse {
  chat_id?: EntityId;
  detail?: string;
}

export const useCreateGroup = (onCreated: (message: string, groupName: string, chatId?: EntityId) => void) => {
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
      const avatarResponse = await authFetch(`${BASE_URL}/groups/${createdGroup.chat_id}/avatar`, { method: 'POST', body: formData }).catch(() => undefined);
      if (!avatarResponse?.ok) avatarWarning = ` ${translations.avatarUploadFailed || 'Avatar upload failed.'}`;
    }
    onCreated(`${translations.groupCreated}${avatarWarning}`, groupName, createdGroup.chat_id);
  };
};
