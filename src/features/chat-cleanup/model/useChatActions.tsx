import { useState } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import { useDeleteChatMutation } from '@/entities/chat';
import { useBlockUserMutation, useGetBlockedUsersQuery, useLazyGetUserByUsernameQuery, useUnblockUserMutation } from '@/entities/user';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { asApiError } from '@/shared/lib/apiError';
import { toast } from '@/shared/ui/sonner';
import { ChatCleanupDialog } from '../ui/ChatCleanupDialog';
import { BlockUserDialog } from '../ui/BlockUserDialog';
import { useChatCleanup, type CleanupRequest, type CleanupScope } from './useChatCleanup';

export interface ChatActionTarget {
  chatId?: EntityId;
  username: string;
  userId?: EntityId;
  name: string;
  isGroup?: boolean;
  isSaved?: boolean;
  canClearForEveryone?: boolean;
}

interface ChatActionsOptions {
  onDeleted?: (chatId: EntityId, scope: CleanupScope) => void;
  onCleared?: (chatId: EntityId, scope: CleanupScope) => void;
}

const cleanupTarget = (target: ChatActionTarget & { chatId: EntityId }) => ({
  chatId: target.chatId, name: target.name, isGroup: !!target.isGroup, isSaved: !!target.isSaved,
  canClearForEveryone: !target.isGroup || !!target.canClearForEveryone,
});

export const useChatActions = ({ onDeleted, onCleared }: ChatActionsOptions = {}) => {
  const { translations } = useLanguage();
  const [blocking, setBlocking] = useState<ChatActionTarget | null>(null);
  const [blockError, setBlockError] = useState<string | null>(null);
  const [reporting, setReporting] = useState<{ userId: EntityId; name: string } | null>(null);
  const { data: blockedUsers } = useGetBlockedUsersQuery();
  const [blockUser, blockState] = useBlockUserMutation();
  const [unblockUser, unblockState] = useUnblockUserMutation();
  const [deleteChat, deleteState] = useDeleteChatMutation();
  const [lookupUser] = useLazyGetUserByUsernameQuery();
  const cleanup = useChatCleanup((request: CleanupRequest, scope) => {
    if (request.kind === 'delete') onDeleted?.(request.target.chatId, scope);
    else onCleared?.(request.target.chatId, scope);
  }, (message) => toast(message || translations.errorLoading));

  const isBlocked = (username: string) => !!blockedUsers?.users?.some((user) => user.username === username);

  const openDelete = (target: ChatActionTarget) => {
    if (target.chatId !== undefined) cleanup.open({ kind: 'delete', target: cleanupTarget({ ...target, chatId: target.chatId }) });
  };
  const openClear = (target: ChatActionTarget) => {
    if (target.chatId !== undefined) cleanup.open({ kind: 'clear', target: cleanupTarget({ ...target, chatId: target.chatId }) });
  };
  const openBlock = async (target: ChatActionTarget) => {
    const values = { name: target.name };
    if (!isBlocked(target.username)) {
      setBlockError(null);
      setBlocking(target);
      return;
    }
    try {
      await unblockUser(target.username).unwrap();
      toast(fillTemplate(translations.blockUser.unblocked, values));
    } catch {
      toast(fillTemplate(translations.blockUser.unblockFailed, values));
    }
  };
  const confirmBlock = async (alsoDelete: boolean) => {
    if (!blocking) return;
    const values = { name: blocking.name };
    try {
      await blockUser(blocking.username).unwrap();
      if (alsoDelete && blocking.chatId !== undefined) {
        await deleteChat({ chatId: blocking.chatId, scope: 'me' }).unwrap();
        onDeleted?.(blocking.chatId, 'me');
      }
      toast(fillTemplate(translations.blockUser.blocked, values));
      setBlocking(null);
    } catch (caught) {
      const error = asApiError(caught);
      setBlockError(error?.data?.detail || fillTemplate(translations.blockUser.failed, values));
    }
  };
  const openReport = async (target: ChatActionTarget) => {
    if (target.userId !== undefined) {
      setReporting({ userId: target.userId, name: target.name });
      return;
    }
    try {
      const user = await lookupUser(target.username).unwrap();
      setReporting({ userId: user.id, name: target.name });
    } catch {
      toast(translations.errorLoading);
    }
  };

  const dialogs = (
    <>
      <ChatCleanupDialog request={cleanup.request} busy={cleanup.busy} onCancel={cleanup.close}
        onConfirm={(forEveryone) => void cleanup.confirm(forEveryone)} />
      {blocking && (
        <BlockUserDialog name={blocking.name} canDeleteChat={blocking.chatId !== undefined && !blocking.isSaved}
          busy={blockState.isLoading || deleteState.isLoading} error={blockError}
          onCancel={() => setBlocking(null)} onConfirm={(alsoDelete) => void confirmBlock(alsoDelete)} />
      )}
    </>
  );

  return {
    isBlocked, openDelete, openClear, openReport, dialogs, reporting, closeReport: () => setReporting(null),
    openBlock: (target: ChatActionTarget) => void openBlock(target),
    blockBusy: blockState.isLoading || unblockState.isLoading,
  };
};
