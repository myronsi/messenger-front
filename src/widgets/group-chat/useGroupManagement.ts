import { isAccountRestricted } from '@/shared/api/accountRestriction';
import { getApiBaseUrl } from '@/shared/api/config';
import type { EntityId } from '@/shared/api/entityId';
import React from 'react';
import type { GroupDetails, GroupEdits, GroupProfileConfirmState, GroupRole } from './GroupProfileTypes';
import type { GroupTranslations, RawGroupDetails } from './groupChatTypes';
import type { ModalState } from '@/entities/message';
import { authFetch } from '@/shared/auth/session';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { groupModel } from '@/shared/api/goModels';
import { setGroupBackground, type SetBackgroundBody } from '@/features/profile';
import { hideChatUntilUndo, showChatAgain } from '@/features/chat-cleanup';
import { showUndoToast } from '@/shared/ui/undoToast';
import { toast } from '@/shared/ui/sonner';

const BASE_URL = getApiBaseUrl();
interface Args {
  chatId: EntityId; token: string; groupForm: { name: string; description: string };
  setModal: React.Dispatch<React.SetStateAction<ModalState | null>>; translations: GroupTranslations;
  setIsSavingGroup: React.Dispatch<React.SetStateAction<boolean>>;
  applyGroupDetails: (details: RawGroupDetails) => void; participantInput: string;
  setParticipantInput: (value: string) => void; refreshGroupDetails: () => Promise<void>;
  setGroupConfirm: React.Dispatch<React.SetStateAction<GroupProfileConfirmState | null>>;
  groupDetails: GroupDetails | null; onBack: () => void;
  undoText: { undo: string; countdown: string };
}
const RELIST_AFTER_MS = 3000;
export const useGroupManagement = ({
  chatId, token, groupForm, setModal, translations, setIsSavingGroup, applyGroupDetails, participantInput,
  setParticipantInput, refreshGroupDetails, setGroupConfirm, groupDetails, onBack, undoText,
}: Args) => {
  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) {
      setModal({ type: 'error', message: translations.groupNameRequired || 'Group name is required' });
      return;
    }
    setIsSavingGroup(true);
    try {
      const response = await authFetch(`${BASE_URL}/groups/${chatId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupForm.name.trim(), description: groupForm.description.trim() }),
      });
      if (!response.ok) throw new Error(await response.text());
      applyGroupDetails(await response.json());
    } catch (error) {
      console.error('Error updating group:', error);
      setModal({ type: 'error', message: translations.errorUpdatingGroup || 'Failed to update group' });
    } finally {
      setIsSavingGroup(false);
    }
  };

  const handleGroupAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await authFetch(`${BASE_URL}/groups/${chatId}/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) throw new Error(await response.text());
      applyGroupDetails(await response.json());
    } catch (error) {
      console.error('Error uploading group avatar:', error);
      setModal({ type: 'error', message: translations.errorUpdatingGroup || 'Failed to update group' });
    } finally {
      event.target.value = '';
    }
  };

  const handleGroupBackground = async (body: SetBackgroundBody | null) => {
    applyGroupDetails(groupModel(await setGroupBackground(String(chatId), body)));
  };

  const sendGroup = async (path: string, init: RequestInit) => {
    const response = await authFetch(`${BASE_URL}/groups/${chatId}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...init.headers } });
    if (!response.ok) throw new Error(await response.text());
    applyGroupDetails(await response.json());
  };

  const saveGroupEdits = async ({ info, avatar, background }: GroupEdits) => {
    if (info && !info.name.trim()) {
      setModal({ type: 'error', message: translations.groupNameRequired || 'Group name is required' });
      return false;
    }
    setIsSavingGroup(true);
    try {
      if (info) {
        await sendGroup('', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: info.name.trim(), description: info.description.trim() }),
        });
      }
      if (avatar) {
        const form = new FormData();
        form.append('file', avatar);
        await sendGroup('/avatar', { method: 'POST', body: form });
      } else if (avatar === null) await sendGroup('/avatar', { method: 'DELETE' });
      if (background !== undefined) await handleGroupBackground(background);
      return true;
    } catch (error) {
      console.error('Error updating group:', error);
      setModal({ type: 'error', message: translations.errorUpdatingGroup || 'Failed to update group' });
      return false;
    } finally {
      setIsSavingGroup(false);
    }
  };

  const handleAddParticipant = async (usernameOverride?: string) => {
    const newUsername = (usernameOverride || participantInput).trim();
    if (!newUsername) return;
    try {
      const response = await authFetch(`${BASE_URL}/groups/${chatId}/participants`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername }),
      });
      if (response.status === 403 && isAccountRestricted(await response.clone().json().catch(() => null))) return;
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      if (data?.participants || data?.pending_invites) {
        applyGroupDetails(data);
      } else {
        await refreshGroupDetails();
      }
      setParticipantInput('');
    } catch (error) {
      console.error('Error adding participant:', error);
      setModal({ type: 'error', message: translations.errorUpdatingGroup || 'Failed to update group' });
    }
  };

  const handleRemoveParticipant = async (participantUsername: string) => {
    window.setTimeout(() => {
      setGroupConfirm({
        title: translations.removeParticipant || 'Remove participant',
        message: translations.removeParticipantConfirm || `Remove @${participantUsername} from this group? They cannot rejoin until an owner or admin allows it.`,
        confirmText: translations.remove || 'Remove',
        isDestructive: true,
        kind: 'remove',
        onConfirm: async () => {
          setGroupConfirm(null);
          try {
            const response = await authFetch(`${BASE_URL}/groups/${chatId}/participants/${encodeURIComponent(participantUsername)}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error(await response.text());
            applyGroupDetails(await response.json());
          } catch (error) {
            console.error('Error removing participant:', error);
            setModal({ type: 'error', message: translations.errorUpdatingGroup || 'Failed to update group' });
          }
        },
      });
    }, 0);
  };

  const handleRoleChange = async (participantUsername: string, role: GroupRole) => {
    try {
      const response = await authFetch(`${BASE_URL}/groups/${chatId}/participants/${encodeURIComponent(participantUsername)}/role`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) throw new Error(await response.text());
      applyGroupDetails(await response.json());
    } catch (error) {
      console.error('Error updating participant role:', error);
      setModal({ type: 'error', message: translations.errorUpdatingGroup || 'Failed to update group' });
    }
  };

  const handleTransferOwner = (participantUsername: string) => {
    window.setTimeout(() => {
      setGroupConfirm({
        title: translations.transferOwnership || 'Transfer ownership',
        message: translations.transferOwnershipConfirm || `Transfer group ownership to @${participantUsername}? They will become the owner and you will stay in the group as an admin.`,
        confirmText: translations.transferOwnership || 'Transfer ownership',
        onConfirm: async () => {
          setGroupConfirm(null);
          try {
            const response = await authFetch(`${BASE_URL}/groups/${chatId}/transfer-owner`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: participantUsername }),
            });
            if (!response.ok) throw new Error(await response.text());
            applyGroupDetails(await response.json());
          } catch (error) {
            console.error('Error transferring ownership:', error);
            setModal({ type: 'error', message: translations.errorUpdatingGroup || 'Failed to update group' });
          }
        },
      });
    }, 0);
  };

  const handleLeaveGroup = () => {
    window.setTimeout(() => {
      if (groupDetails?.current_user_role === 'owner') {
        setGroupConfirm({
          title: translations.leaveGroup || 'Leave group',
          message: translations.ownerLeaveGroupHint || 'You are the group owner. Transfer ownership before leaving the group.',
          isError: true,
          onConfirm: () => setGroupConfirm(null),
        });
        return;
      }

      const name = { name: groupDetails?.name || '' };
      setGroupConfirm({
        title: fillTemplate(translations.leaveGroupTitle || translations.leaveGroup || 'Leave group', name),
        message: '',
        consequences: (translations.leaveGroupPoints || []).map((point) => fillTemplate(point, name)),
        confirmText: translations.leaveGroup || 'Leave group',
        isDestructive: true,
        kind: 'leave',
        onConfirm: async () => {
          setGroupConfirm(null);
          try {
            const response = await authFetch(BASE_URL + '/groups/' + chatId + '/leave', {
              method: 'POST',
              headers: { Authorization: 'Bearer ' + token },
            });
            if (!response.ok) throw new Error(await response.text());
            onBack();
          } catch (error) {
            console.error('Error leaving group:', error);
            setModal({ type: 'error', message: translations.errorLeavingGroup || 'Failed to leave group' });
          }
        },
      });
    }, 0);
  };

  const handleDeleteGroup = () => {
    window.setTimeout(() => {
      setGroupConfirm({
        title: translations.deleteGroup || 'Delete group',
        message: translations.deleteGroupConfirm || 'After deleting this group, the following consequences will apply:',
        consequences: translations.deleteGroupConsequences || [
          'The group will be deleted for every participant.',
          'Members will lose access to this conversation in the app.',
          'This action cannot be undone.',
        ],
        confirmText: translations.deleteGroup || 'Delete group',
        isDestructive: true,
        kind: 'delete',
        onConfirm: () => {
          setGroupConfirm(null);
          const removeGroup = async () => {
            try {
              const response = await authFetch(`${BASE_URL}/groups/delete/${chatId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!response.ok) throw new Error(await response.text());
              window.setTimeout(() => showChatAgain(chatId), RELIST_AFTER_MS);
            } catch (error) {
              console.error('Error deleting group:', error);
              showChatAgain(chatId);
              toast(translations.errorDeletingGroup || 'Failed to delete group');
            }
          };
          hideChatUntilUndo(chatId);
          onBack();
          showUndoToast({
            message: translations.groupDeleted || 'Group has been deleted.',
            undoLabel: undoText.undo,
            countdownLabel: undoText.countdown,
            onUndo: () => showChatAgain(chatId),
            onExpire: () => void removeGroup(),
          });
        },
      });
    }, 0);
  };

  return {
    handleSaveGroup, handleGroupAvatarUpload, handleAddParticipant, handleRemoveParticipant,
    handleRoleChange, handleTransferOwner, handleLeaveGroup, handleDeleteGroup, handleGroupBackground, saveGroupEdits,
  };
};
