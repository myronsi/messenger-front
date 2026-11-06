import type { EntityId } from '@/shared/api/entityId';
import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { ApprovalRequest } from '@/entities/chat';
import { DEFAULT_AVATAR } from '@/shared/base/ui';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { useNavigate } from 'react-router-dom';
import type { PrivacyDetail, SecurityDetail, SettingsPage, UrlOverlay } from '@/shared/lib/urlOverlay';
import { currentEntryMarks, useUrlOverlay } from '@/shared/lib/useUrlOverlay';
import { useApproveApprovalRequestMutation, useGetApprovalRequestInboxQuery, useRejectApprovalRequestMutation } from '@/entities/chat';
import type { ProfileModalState } from './useProfileAccountActions';
import { useGetBlockedUsersQuery, useUnblockUserMutation } from '@/entities/user';

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

export const getProfileAvatarUrl = (avatarUrl?: string | null) => resolveMediaUrl(avatarUrl);

export const getProfileMediaUrl = (path?: string | null, fallback = DEFAULT_AVATAR) => resolveMediaUrl(path, fallback);

type SettingsOverlay = Extract<UrlOverlay, { kind: 'settings' }>;

const settingsDepth = (target: SettingsOverlay) => {
  if (target.page === 'profile') return 0;
  if (!target.detail && !target.securityDetail) return 1;
  return target.exceptions ? 3 : 2;
};

interface ProfilePanelDataOptions {
  setModal: Dispatch<SetStateAction<ProfileModalState | null>>;
}

export const useProfilePanelData = ({ setModal }: ProfilePanelDataOptions) => {
  const navigate = useNavigate();
  const { overlay, open: openOverlay, replace: replaceOverlay } = useUrlOverlay();
  const settings: SettingsOverlay = overlay?.kind === 'settings' ? overlay : { kind: 'settings', page: 'profile' };
  const activeProfilePage: SettingsPage = settings.page;
  const goToSettings = useCallback((target: SettingsOverlay) => {
    const from = settingsDepth(settings);
    const to = settingsDepth(target);
    const marks = currentEntryMarks();
    if (to < from && from - to <= (marks.settingsChain ?? 0)) navigate(to - from);
    else if (to === from + 1) openOverlay(target, { settingsDepth: to, settingsChain: (marks.settingsChain ?? 0) + 1 });
    else replaceOverlay(target);
  }, [navigate, openOverlay, replaceOverlay, settings]);
  const setActiveProfilePage = useCallback((page: SettingsPage) => goToSettings({ kind: 'settings', page }), [goToSettings]);
  const openPrivacyDetail = useCallback((detail: PrivacyDetail | null, exceptions?: 'allow' | 'deny') => (
    goToSettings(detail ? { kind: 'settings', page: 'privacy', detail, exceptions } : { kind: 'settings', page: 'privacy' })
  ), [goToSettings]);
  const openSecurityDetail = useCallback((detail: SecurityDetail | null) => (
    goToSettings(detail ? { kind: 'settings', page: 'security', securityDetail: detail } : { kind: 'settings', page: 'security' })
  ), [goToSettings]);
  const { data: blockedUsersData } = useGetBlockedUsersQuery();
  const { data: requestInbox, refetch: refetchRequestInbox } = useGetApprovalRequestInboxQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [approveRequest, { isLoading: isApprovingRequest }] = useApproveApprovalRequestMutation();
  const [rejectRequest, { isLoading: isRejectingRequest }] = useRejectApprovalRequestMutation();
  const [unblockUser, { isLoading: isUnblockingUser }] = useUnblockUserMutation();
  const blockedUsers = blockedUsersData?.users || [];
  const pendingRequestCount = requestInbox?.unread_count || 0;
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

  const handleRejectRequest = async (requestId: EntityId) => {
    try {
      await rejectRequest(requestId).unwrap();
      await refetchRequestInbox();
    } catch (error) {
      setModal({ type: 'error', message: getErrorMessage(error, 'Failed to reject request') });
    }
  };

  return {
    activeProfilePage, setActiveProfilePage, privacyDetail: settings.detail, privacyExceptions: settings.exceptions, openPrivacyDetail, blockedUsers,
    securityDetail: settings.securityDetail, openSecurityDetail,
    requestInbox, pendingRequestCount, isApprovingRequest, isRejectingRequest,
    isUnblockingUser, handleUnblockUser,
    handleApproveRequest, handleRejectRequest, getProfileAvatarUrl, getProfileMediaUrl,
  };
};
