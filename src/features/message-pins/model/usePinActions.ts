import { useCallback } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { toast } from '@/shared/ui/sonner';
import { usePinMessageMutation, useUnpinMessageMutation, type PinScope } from '@/entities/message';

interface ProblemError {
  status?: number | string;
  data?: { code?: string } | null;
}

export const pinErrorText = (error: unknown, t: { limitReached: string; notAllowed: string }, fallback: string) => {
  const problem = (error ?? {}) as ProblemError;
  if (problem.data?.code === 'limit_reached' || problem.status === 409) return t.limitReached;
  if (problem.status === 403 || problem.status === 422) return t.notAllowed;
  return fallback;
};

export const usePinActions = (chatId: EntityId) => {
  const t = useLanguage().translations.messagePins;
  const [pinMessage] = usePinMessageMutation();
  const [unpinMessage] = useUnpinMessageMutation();

  const pin = useCallback(async (messageId: EntityId, scope: PinScope) => {
    try {
      await pinMessage({ chatId, messageId, scope }).unwrap();
    } catch (error) {
      toast.error(pinErrorText(error, t, t.pinFailed));
    }
  }, [chatId, pinMessage, t]);

  const unpin = useCallback(async (messageId: EntityId, scope: PinScope) => {
    try {
      await unpinMessage({ chatId, messageId, scope }).unwrap();
    } catch (error) {
      toast.error(pinErrorText(error, t, t.unpinFailed));
    }
  }, [chatId, t, unpinMessage]);

  return { pin, unpin };
};
