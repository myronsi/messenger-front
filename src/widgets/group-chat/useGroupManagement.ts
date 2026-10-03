import React from 'react';
import type { GroupDetails, GroupProfileConfirmState, GroupRole } from './GroupProfileTypes';
import type { GroupTranslations, RawGroupDetails } from './groupChatTypes';
import type { ModalState } from '@/entities/message';
import { authFetch } from '@/shared/auth/session';

const BASE_URL = import.meta.env.VITE_BASE_URL;
interface Args {
  chatId: number; token: string; groupForm: { name: string; description: string };
  setModal: React.Dispatch<React.SetStateAction<ModalState | null>>; translations: GroupTranslations;
  setIsSavingGroup: React.Dispatch<React.SetStateAction<boolean>>;
  applyGroupDetails: (details: RawGroupDetails) => void; participantInput: string;
  setParticipantInput: (value: string) => void; refreshGroupDetails: () => Promise<void>;
  setGroupConfirm: React.Dispatch<React.SetStateAction<GroupProfileConfirmState | null>>;
  groupDetails: GroupDetails | null; onBack: () => void;
}
export const useGroupManagement = ({
  chatId, token, groupForm, setModal, translations, setIsSavingGroup, applyGroupDetails, participantInput,
  setParticipantInput, refreshGroupDetails, setGroupConfirm, groupDetails, onBack,
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

  const handleAddParticipant = async (usernameOverride?: string) => {
    const newUsername = (usernameOverride || participantInput).trim();
    if (!newUsername) return;
    try {
      const response = await authFetch(`${BASE_URL}/groups/${chatId}/participants`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername }),
      });
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
        message: translations.removeParticipantConfirm || `Remove @${participantUsername} from this group? They will lose access to the group chat until someone adds them again.`,
        confirmText: translations.remove || 'Remove',
        isDestructive: true,
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

      setGroupConfirm({
        title: translations.leaveGroup || 'Leave group',
        message: translations.leaveGroupConfirm || 'After leaving this group, the following consequences will apply:',
        consequences: translations.leaveGroupConsequences || [
          'You will be removed from the participants list.',
          'You will lose access to new messages and group updates.',
          'Another admin or owner will need to add you back.',
        ],
        confirmText: translations.leaveGroup || 'Leave group',
        isDestructive: true,
        onConfirm: async () => {
          setGroupConfirm(null);
          try {
            const response = await authFetch(BASE_URL + '/groups/' + chatId + '/leave', {
              method: 'DELETE',
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
        onConfirm: async () => {
          setGroupConfirm(null);
          try {
            const response = await authFetch(`${BASE_URL}/groups/delete/${chatId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error(await response.text());
            onBack();
          } catch (error) {
            console.error('Error deleting group:', error);
            setModal({ type: 'error', message: translations.errorDeletingGroup || 'Failed to delete group' });
          }
        },
      });
    }, 0);
  };

  return {
    handleSaveGroup, handleGroupAvatarUpload, handleAddParticipant, handleRemoveParticipant,
    handleRoleChange, handleTransferOwner, handleLeaveGroup, handleDeleteGroup,
  };
};
