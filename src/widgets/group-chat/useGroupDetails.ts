import { isPersistedId } from '@/shared/api/entityId';
import type { EntityId } from '@/shared/api/entityId';
import React, { useCallback, useEffect } from 'react';
import { DEFAULT_AVATAR, DEFAULT_GROUP_AVATAR } from '@/shared/base/ui';
import { messengerApi } from '@/shared/api/baseApi';
import { useGetGroupDetailsQuery } from '@/entities/chat';
import type { GroupDetails, GroupParticipant, GroupPendingInvite, GroupRole } from './GroupProfileTypes';
import type { RawGroupDetails } from './groupChatTypes';
import { useAppDispatch } from '@/shared/hooks/redux';
import { permissionsForRole, getAvatarSrc } from './groupChatUtils';
interface Args {
  chatId: EntityId; username: string; groupName: string; token: string;
  dispatch: ReturnType<typeof useAppDispatch>; groupDetails: GroupDetails | null;
  groupForm: { name: string; description: string };
  setGroupDetails: React.Dispatch<React.SetStateAction<GroupDetails | null>>;
  setGroupForm: React.Dispatch<React.SetStateAction<{ name: string; description: string }>>;
}
export const useGroupDetails = ({
  chatId, username, groupName, token, dispatch, groupDetails, groupForm, setGroupDetails, setGroupForm,
}: Args) => {
  const normalizeGroupDetails = useCallback((raw: RawGroupDetails): GroupDetails => {
    const participants: GroupParticipant[] = (raw?.participants || []).map((participant) => {
      const role = (participant.role || (participant.is_owner ? 'owner' : participant.is_admin ? 'admin' : 'member')) as GroupRole;
      return {
        id: participant.id,
        username: participant.username,
        display_name: participant.display_name || participant.username,
        avatar_url: participant.avatar_url || DEFAULT_AVATAR,
        role,
        is_owner: role === 'owner',
        is_admin: role === 'owner' || role === 'admin',
      };
    });
    const pendingInvites: GroupPendingInvite[] = (raw?.pending_invites || []).map((invite) => ({
      request_id: invite.request_id,
      id: invite.id,
      username: invite.username,
      display_name: invite.display_name || invite.username,
      avatar_url: invite.avatar_url || DEFAULT_AVATAR,
      status: 'pending',
    }));
    const currentParticipant = participants.find((participant) => participant.username === username);
    const currentRole = (raw?.current_user_role || currentParticipant?.role || (raw?.owner_username === username ? 'owner' : 'member')) as GroupRole;

    return {
      chat_id: raw.chat_id,
      name: raw.name || groupName,
      description: raw.description || '',
      avatar_url: raw.avatar_url || DEFAULT_GROUP_AVATAR,
      owner_id: raw.owner_id ?? raw.admin_id ?? 0,
      owner_username: raw.owner_username || raw.admin_username || '',
      admin_id: raw.admin_id ?? raw.owner_id,
      admin_username: raw.admin_username || raw.owner_username,
      current_user_role: currentRole,
      permissions: permissionsForRole(currentRole),
      participants,
      pending_invites: pendingInvites,
    };
  }, [groupName, username]);

  const currentGroupName = groupDetails?.name || groupForm.name || groupName;
  const currentGroupAvatar = getAvatarSrc(groupDetails?.avatar_url || DEFAULT_GROUP_AVATAR);

  const applyGroupDetails = useCallback((rawDetails: RawGroupDetails, syncCache = true) => {
    const data = normalizeGroupDetails(rawDetails);
    setGroupDetails(data);
    setGroupForm({ name: data.name || groupName, description: data.description || '' });

    if (syncCache && isPersistedId(chatId)) {
      dispatch(Reflect.apply(messengerApi.util.upsertQueryData, messengerApi.util, ['getGroupDetails', chatId, rawDetails]));
    }
  }, [chatId, dispatch, groupName, normalizeGroupDetails, setGroupDetails, setGroupForm]);

  const skipGroupDetails = !token || !isPersistedId(chatId);
  const {
    data: latestGroupDetails,
    error: groupDetailsError,
    refetch: refetchGroupDetails,
  } = useGetGroupDetailsQuery(chatId, {
    skip: skipGroupDetails,
    refetchOnMountOrArgChange: true,
  });

  const refreshGroupDetails = useCallback(async () => {
    if (skipGroupDetails) return;
    try {
      await refetchGroupDetails().unwrap();
    } catch (error) {
      console.error('Error refreshing group details:', error);
    }
  }, [refetchGroupDetails, skipGroupDetails]);

  useEffect(() => {
    if (!latestGroupDetails) return;

    applyGroupDetails(latestGroupDetails, false);
  }, [applyGroupDetails, latestGroupDetails]);

  useEffect(() => {
    if (!groupDetailsError) return;

    console.error(`Error loading group details for ${chatId}:`, groupDetailsError);
  }, [chatId, groupDetailsError]);

  return { getAvatarSrc, normalizeGroupDetails, currentGroupName, currentGroupAvatar, applyGroupDetails, refreshGroupDetails };
};
