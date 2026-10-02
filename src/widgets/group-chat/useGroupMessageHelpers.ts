import { useCallback } from 'react';
import type { Message } from '@/entities/message';
import { formatDateLabel, formatTime } from '@/shared/utils/dateFormatters';
import type { GroupDetails } from './GroupProfileTypes';

interface UseGroupMessageHelpersArgs {
  username: string;
  language: 'en' | 'ru';
  currentUserId: number;
  groupDetails: Pick<GroupDetails, 'permissions'> | null;
}

// Pure display/permission helpers for group messages.
export const useGroupMessageHelpers = ({ username, language, currentUserId, groupDetails }: UseGroupMessageHelpersArgs) => {
  const isOwnMessage = useCallback((message: Message) => {
    if (message.is_own) return true;
    if (currentUserId && message.sender_id) return message.sender_id === currentUserId;
    const ownUsername = username.toLowerCase();
    return [message.sender_username, message.sender]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase() === ownUsername);
  }, [currentUserId, username]);

  const canDeleteMessage = useCallback((message: Message) => {
    return isOwnMessage(message) || !!groupDetails?.permissions?.can_delete_any_message;
  }, [groupDetails?.permissions?.can_delete_any_message, isOwnMessage]);

  const getFormattedDateLabel = useCallback((timestamp: string): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return formatDateLabel(timestamp, language, today, yesterday);
  }, [language]);

  const getMessageTime = useCallback((timestamp: string): string => formatTime(timestamp, language), [language]);

  return { isOwnMessage, canDeleteMessage, getFormattedDateLabel, getMessageTime };
};