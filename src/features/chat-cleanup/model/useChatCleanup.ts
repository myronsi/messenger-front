import { useState } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import { useClearChatHistoryMutation, useDeleteChatMutation } from '@/entities/chat';
import { asApiError } from '@/shared/lib/apiError';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { showUndoToast } from '@/shared/ui/undoToast';
import { hideChatUntilUndo, showChatAgain } from './pendingRemovals';

const RELIST_AFTER_MS = 3000;

export type CleanupKind = 'delete' | 'clear';
export type CleanupScope = 'me' | 'everyone';

export interface CleanupTarget {
  chatId: EntityId;
  name: string;
  isGroup: boolean;
  isSaved: boolean;
  canClearForEveryone: boolean;
}

export interface CleanupRequest {
  kind: CleanupKind;
  target: CleanupTarget;
}

export const offersEveryone = ({ kind, target }: CleanupRequest) =>
  !target.isSaved && (kind === 'delete' ? !target.isGroup : !target.isGroup || target.canClearForEveryone);

export const useChatCleanup = (onDone: (request: CleanupRequest, scope: CleanupScope) => void, onError: (message: string) => void) => {
  const { translations } = useLanguage();
  const [request, setRequest] = useState<CleanupRequest | null>(null);
  const [deleteChat] = useDeleteChatMutation();
  const [clearHistory] = useClearChatHistoryMutation();

  const run = async (confirmed: CleanupRequest, scope: CleanupScope) => {
    const { chatId } = confirmed.target;
    try {
      if (confirmed.kind === 'delete') await deleteChat({ chatId, scope }).unwrap();
      else await clearHistory({ chatId, scope }).unwrap();
    } catch (caught) {
      if (confirmed.kind === 'delete') showChatAgain(chatId);
      const error = asApiError(caught);
      onError(error?.data?.detail || error?.message || '');
      return;
    }
    if (confirmed.kind === 'delete') window.setTimeout(() => showChatAgain(chatId), RELIST_AFTER_MS);
  };

  const confirm = (forEveryone: boolean) => {
    if (!request) return;
    const confirmed = request;
    const scope: CleanupScope = confirmed.target.isSaved || (forEveryone && offersEveryone(confirmed)) ? 'everyone' : 'me';
    const t = translations.chatCleanup;
    setRequest(null);
    if (confirmed.kind === 'delete') hideChatUntilUndo(confirmed.target.chatId);
    onDone(confirmed, scope);
    showUndoToast({
      message: confirmed.kind === 'delete' ? t.deleted : t.cleared,
      undoLabel: t.undo,
      countdownLabel: t.undoCountdown,
      onUndo: () => {
        if (confirmed.kind === 'delete') showChatAgain(confirmed.target.chatId);
      },
      onExpire: () => void run(confirmed, scope),
    });
  };

  return { request, open: setRequest, close: () => setRequest(null), confirm, busy: false };
};
