import { asApiError } from '@/shared/lib/apiError';
import { useMemo, useState } from 'react';
import { useApproveApprovalRequestMutation, useGetApprovalRequestInboxQuery, useGetOneOnOneChatsQuery, useRejectApprovalRequestMutation } from '@/entities/chat';
import type { ApprovalRequest } from '@/entities/chat';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import type { ProfileModalState } from './useProfileAccountActions';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useBlockUserMutation, useGetBlockedUsersQuery, useUnblockUserMutation } from '@/entities/user';
import type { Id } from '@/shared/lib/ids';

interface UseProfileConnectionsArgs {
  username: string;
  blockUserConsequences: string[];
  setModal: (modal: ProfileModalState | null) => void;
}

export const useProfileConnections = ({ username, blockUserConsequences, setModal }: UseProfileConnectionsArgs) => {
  const { translations } = useLanguage();
  const { data: blockedUsersData } = useGetBlockedUsersQuery();
  const { data: dmChatsData } = useGetOneOnOneChatsQuery(username, { skip: !username });
  const { data: requestInbox, refetch: refetchRequestInbox } = useGetApprovalRequestInboxQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [approveRequest, { isLoading: isApprovingRequest }] = useApproveApprovalRequestMutation();
  const [rejectRequest, { isLoading: isRejectingRequest }] = useRejectApprovalRequestMutation();
  const [blockUser, { isLoading: isBlockingUser }] = useBlockUserMutation();
  const [unblockUser, { isLoading: isUnblockingUser }] = useUnblockUserMutation();
  const [blockUsername, setBlockUsername] = useState('');
  const [pendingBlockUsername, setPendingBlockUsername] = useState('');
  const [isBlockDmContactsCollapsed, setIsBlockDmContactsCollapsed] = useState(true);

  const blockedUsers = blockedUsersData?.users || [];
  const blockedUsernameSet = useMemo(
    () => new Set(blockedUsers.map((blockedUser) => blockedUser.username.toLowerCase())),
    [blockedUsers],
  );
  const blockDmContactSuggestions = useMemo(() => {
    const currentUsername = username.toLowerCase();
    const query = blockUsername.trim().toLowerCase();
    const seen = new Set<string>();
    return (dmChatsData?.chats || [])
      .filter((chat) => !chat.interlocutor_deleted && !!chat.interlocutor_name)
      .map((chat) => ({
        username: chat.interlocutor_name,
        display_name: chat.interlocutor_display_name || chat.interlocutor_name,
        avatar_url: chat.avatar_url,
      }))
      .filter((contact) => {
        const usernameKey = contact.username.toLowerCase();
        if (usernameKey === currentUsername || blockedUsernameSet.has(usernameKey) || seen.has(usernameKey)) return false;
        seen.add(usernameKey);
        return !query || usernameKey.includes(query) || (contact.display_name || '').toLowerCase().includes(query);
      })
      .slice(0, 6);
  }, [blockUsername, blockedUsernameSet, dmChatsData?.chats, username]);

  const handleBlockUser = async (usernameOverride?: string) => {
    const nextUsername = (usernameOverride || blockUsername).trim();
    if (!nextUsername) return;
    setPendingBlockUsername(nextUsername);
    setModal({
      type: 'blockUser',
      message: translations.blockUserConfirmMessage || 'After blocking this user, the following consequences will apply:',
      consequences: blockUserConsequences,
      onConfirm: async () => {
        try {
          await blockUser({ username: nextUsername }).unwrap();
          setBlockUsername('');
          setPendingBlockUsername('');
          setModal(null);
        } catch (caught) {
          const error = asApiError(caught);
          setModal({ type: 'error', message: error?.data?.detail || 'Failed to block user' });
        }
      },
    });
  };

  const handleBlockUserConfirmed = async () => {
    const nextUsername = pendingBlockUsername.trim();
    if (!nextUsername) return;
    try {
      await blockUser({ username: nextUsername }).unwrap();
      setBlockUsername('');
      setPendingBlockUsername('');
      setModal(null);
    } catch (caught) {
      const error = asApiError(caught);
      setModal({ type: 'error', message: error?.data?.detail || 'Failed to block user' });
    }
  };

  const handleUnblockUser = async (targetUsername: string) => {
    try {
      await unblockUser({ username: targetUsername }).unwrap();
    } catch (caught) {
      const error = asApiError(caught);
      setModal({ type: 'error', message: error?.data?.detail || 'Failed to unblock user' });
    }
  };

  const handleApproveRequest = async (request: ApprovalRequest) => {
    try {
      await approveRequest(request.id).unwrap();
      refetchRequestInbox();
    } catch (caught) {
      const error = asApiError(caught);
      setModal({ type: 'error', message: error?.data?.detail || error?.message || 'Failed to approve request' });
    }
  };

  const handleRejectRequest = async (requestId: Id) => {
    try {
      await rejectRequest(requestId).unwrap();
      refetchRequestInbox();
    } catch (caught) {
      const error = asApiError(caught);
      setModal({ type: 'error', message: error?.data?.detail || error?.message || 'Failed to reject request' });
    }
  };

  const getMediaUrl = (path?: string | null, fallback = DEFAULT_AVATAR) => resolveMediaUrl(path, fallback);

  return {
    blockedUsers, requestInbox, pendingRequestCount: requestInbox?.unread_count || 0,
    isApprovingRequest, isRejectingRequest, isBlockingUser, isUnblockingUser,
    blockUsername, setBlockUsername, isBlockDmContactsCollapsed, setIsBlockDmContactsCollapsed,
    blockDmContactSuggestions, pendingBlockUsername, handleBlockUser, handleBlockUserConfirmed,
    handleUnblockUser, handleApproveRequest, handleRejectRequest, getMediaUrl,
  };
};
