import { useEffect, useRef, type MutableRefObject } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import type { Translations } from '@/shared/contexts/LanguageContext';
import { isGoApi } from '@/shared/api/goSocket';
import { messageModel } from '@/shared/api/goModels';
import type { components } from '@/shared/api/generated/schema';
import { normalizeHistoryMessage, type Message } from '@/entities/message';
import { forgetUpload } from '@/shared/lib/uploadCancellation';
import { abandonUnsentMessages } from './messageUpdates';
import type { OutgoingPayload, SetMessages } from './types';

export interface UploadSource {
  files: { file: Blob; fileName: string }[];
  objectUrls: string[];
}

export const createdMessage = (created: unknown): Message | null => {
  if (!isGoApi() || !created || typeof created !== 'object' || !('created_at' in created)) return null;
  return { ...normalizeHistoryMessage(messageModel(created as components['schemas']['Message'])), is_own: true, is_live: true };
};

export const useUnsentMessageRelease = (chatId: EntityId, setMessages: SetMessages, translationsRef: MutableRefObject<Translations>) => {
  const uploadSourcesRef = useRef(new Map<string, UploadSource>());
  const uploadingRef = useRef(new Set<string>());
  const releasedRef = useRef(false);

  const releaseSource = (id: string) => {
    const source = uploadSourcesRef.current.get(id);
    source?.objectUrls.forEach(url => URL.revokeObjectURL(url));
    uploadSourcesRef.current.delete(id);
    forgetUpload(id);
  };

  const dropCancelledUpload = (id: string) => {
    uploadingRef.current.delete(id);
    releaseSource(id);
    setMessages((previous) => previous.filter((message) => String(message.id) !== id));
  };

  useEffect(() => {
    const sources = uploadSourcesRef.current;
    const uploading = uploadingRef.current;
    const latestTranslations = translationsRef;
    releasedRef.current = false;
    return () => {
      releasedRef.current = true;
      const released = new Set<string>();
      sources.forEach((source, id) => {
        if (uploading.has(id)) return;
        source.objectUrls.forEach(url => URL.revokeObjectURL(url));
        sources.delete(id);
        released.add(id);
      });
      setMessages((previous) => abandonUnsentMessages(previous, released, latestTranslations.current.uploadNotSent));
    };
  }, [chatId, setMessages, translationsRef]);

  return { uploadSourcesRef, uploadingRef, releasedRef, releaseSource, dropCancelledUpload };
};

export const deliveryErrorText = (message: string | undefined, translations: Translations) => {
  const lowerMessage = (message || '').toLowerCase();
  if (lowerMessage.includes('block')) {
    return translations.messageNotDeliveredBlocked || "This message could not be delivered due to the recipient's privacy settings.";
  }
  if (lowerMessage.includes('privacy') || lowerMessage.includes('allow') || lowerMessage.includes('permission')) {
    return translations.messageNotDeliveredPrivacy || 'This message cannot be received due to the user privacy settings.';
  }
  return message || translations.messageNotDeliveredPrivacy || 'This message cannot be received due to the user privacy settings.';
};

export const unconfirmedSends = (sent: Map<string, OutgoingPayload>, pending: EntityId[], queue: OutgoingPayload[]) => {
  const stillPending = new Set(pending.map(String));
  const queued = new Set(queue.map(payload => String(payload.client_temp_id)));
  const resend: OutgoingPayload[] = [];
  for (const [id, payload] of sent) {
    if (!stillPending.has(id)) sent.delete(id);
    else if (!queued.has(id)) resend.push(payload);
  }
  return resend;
};
