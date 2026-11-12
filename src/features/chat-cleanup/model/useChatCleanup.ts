import { useState } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import { useClearChatHistoryMutation, useDeleteChatMutation } from '@/entities/chat';
import { asApiError } from '@/shared/lib/apiError';

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
  const [request, setRequest] = useState<CleanupRequest | null>(null);
  const [deleteChat, { isLoading: isDeleting }] = useDeleteChatMutation();
  const [clearHistory, { isLoading: isClearing }] = useClearChatHistoryMutation();

  const confirm = async (forEveryone: boolean) => {
    if (!request) return;
    const scope: CleanupScope = request.target.isSaved || (forEveryone && offersEveryone(request)) ? 'everyone' : 'me';
    const { chatId } = request.target;
    try {
      if (request.kind === 'delete') await deleteChat({ chatId, scope }).unwrap();
      else await clearHistory({ chatId, scope }).unwrap();
      setRequest(null);
      onDone(request, scope);
    } catch (caught) {
      const error = asApiError(caught);
      setRequest(null);
      onError(error?.data?.detail || error?.message || '');
    }
  };

  return { request, open: setRequest, close: () => setRequest(null), confirm, busy: isDeleting || isClearing };
};
