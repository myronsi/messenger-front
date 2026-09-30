import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { ApprovalRequest } from '@/entities/chat';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import {
  useApproveApprovalRequestMutation,
  useBlockUserMutation,
  useGetApprovalRequestInboxQuery,
  useGetBlockedUsersQuery,
  useGetOneOnOneChatsQuery,
  useRejectApprovalRequestMutation,
  useUnblockUserMutation,
} from '@/app/api/messengerApi';
import type { ProfileModalState } from './useProfileAccountActions';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = error.data;
    if (typeof data === 'object' && data !== null && 'detail' in data && typeof data.detail === 'string') {
      return data.detail;
    }
    if ('message' in error && typeof error.message === 'string') return error.message;
  }
  return fallback;
};

export const getProfileAvatarUrl = (avatarUrl?: string | null) => {
  if (!avatarUrl) return DEFAULT_AVATAR;
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl;
  return `${BASE_URL}${avatarUrl}`;
};

export const getProfileMediaUrl = (path?: string | null, fallback = DEFAULT_AVATAR) => {
  if (!path) return fallback;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${BASE_URL}${path}`;
};

interface ProfilePanelDataOptions {
  username: string;
  setModal: Dispatch<SetStateAction<ProfileModalState | null>>;
}

export const useProfilePanelData = ({ username, setModal }: ProfilePanelDataOptions) => {
  const { translations } = useLanguage();
  const [activeProfilePage, setActiveProfilePage] = useState<'profile' | 'requests' | 'personal' | 'privacy' | 'security'>('profile');
  const [blockUsername, setBlockUsername] = useState('');
  const [pendingBlockUsername, setPendingBlockUsername] = useState('');
  const [isBlockDmContactsCollapsed, setIsBlockDmContactsCollapsed] = useState(true);
  const { data: blockedUsersData } = useGetBlockedUsersQuery();
  const { data: dmChatsData } = useGetOneOnOneChatsQuery(username, { skip: !username });
  const { data: requestInbox, refetch: refetchRequestInbox } = useGetApprovalRequestInboxQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [approveRequest, { isLoading: isApprovingRequest }] = useApproveApprovalRequestMutation();
  const [rejectRequest, { isLoading: isRejectingRequest }] = useRejectApprovalRequestMutation();
  const [blockUser, { isLoading: isBlockingUser }] = useBlockUserMutation();
  const [unblockUser, { isLoading: isUnblockingUser }] = useUnblockUserMutation();
  const blockedUsers = blockedUsersData?.users || [];
  const pendingRequestCount = requestInbox?.unread_count || 0;
  const blockedUsernameSet = useMemo(
    () => new Set(blockedUsers.map((user) => user.username.toLowerCase())),
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

  const blockUserConsequences = translations.blockUserConsequences || [
    'They will not be able to send you direct messages.',
    'They will not be able to invite you to groups.',
    'They will not be able to see your private profile details.',
    'Existing chats remain in your list, but messaging requires unblocking them first.',
  ];

  const confirmBlockUser = async () => {
    const target = pendingBlockUsername.trim();
    if (!target) return;
    try {
      await blockUser(target).unwrap();
      setBlockUsername('');
      setPendingBlockUsername('');
      setModal(null);
    } catch (error) {
      setModal({ type: 'error', message: getErrorMessage(error, 'Failed to block user') });
    }
  };

  const handleBlockUser = (usernameOverride?: string) => {
    const target = (usernameOverride || blockUsername).trim();
    if (!target) return;
    setPendingBlockUsername(target);
    setModal({
      type: 'blockUser',
      message: translations.blockUserConfirmMessage || 'After blocking this user, the following consequences will apply:',
      consequences: blockUserConsequences,
      onConfirm: confirmBlockUser,
    });
  };

  const handleUnblockUser = async (targetUsername: string) => {
    try {
      await unblockUser(targetUsername).unwrap();
    } catch (error) {
      setModal({ type: 'error', message: getErrorMessage(error, 'Failed to unblock user') });
    }
  };

  const handleApproveRequest = async (request: ApprovalRequest) => {
    try {
      await approveRequest(request.id).unwrap();
      await refetchRequestInbox();
    } catch (error) {
      setModal({ type: 'error', message: getErrorMessage(error, 'Failed to approve request') });
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      await rejectRequest(requestId).unwrap();
      await refetchRequestInbox();
    } catch (error) {
      setModal({ type: 'error', message: getErrorMessage(error, 'Failed to reject request') });
    }
  };

  return {
    activeProfilePage, setActiveProfilePage, blockUsername, setBlockUsername,
    pendingBlockUsername, setPendingBlockUsername, isBlockDmContactsCollapsed,
    setIsBlockDmContactsCollapsed, blockedUsers, blockDmContactSuggestions,
    requestInbox, pendingRequestCount, isApprovingRequest, isRejectingRequest,
    isBlockingUser, isUnblockingUser, handleBlockUser, handleUnblockUser,
    handleApproveRequest, handleRejectRequest, confirmBlockUser, getProfileAvatarUrl, getProfileMediaUrl,
  };
};
