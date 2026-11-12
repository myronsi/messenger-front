import { useMemo, useSyncExternalStore } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import { useAccessToken } from '@/shared/auth/session';
import { getTokenSubject } from '@/shared/auth/tokenClaims';
import { chatDraftKey, draftId, readChatDraftPreview, subscribeToDrafts } from '@/shared/lib/drafts';

export interface ChatDraftPreview {
  kind: 'draft' | 'edit';
  text: string;
}

export const useChatDraft = (chatId: EntityId): ChatDraftPreview | null => {
  const id = draftId(getTokenSubject(useAccessToken()), chatDraftKey(chatId));
  const snapshot = useSyncExternalStore(subscribeToDrafts, () => readChatDraftPreview(id));
  return useMemo(() => {
    if (!snapshot) return null;
    const split = snapshot.indexOf(':');
    return { kind: snapshot.slice(0, split) === 'edit' ? 'edit' : 'draft', text: snapshot.slice(split + 1) };
  }, [snapshot]);
};
