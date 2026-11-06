import { useEffect, useRef, type MutableRefObject } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import type { Translations } from '@/shared/contexts/LanguageContext';
import { isGoApi } from '@/shared/api/goSocket';
import { messageModel } from '@/shared/api/goModels';
import type { components } from '@/shared/api/generated/schema';
import { normalizeHistoryMessage, type Message } from '@/entities/message';
import { abandonUnsentMessages } from './messageUpdates';
import type { SetMessages } from './types';

export interface UploadSource {
  file: Blob;
  fileName: string;
  objectUrl: string;
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
    if (source) URL.revokeObjectURL(source.objectUrl);
    uploadSourcesRef.current.delete(id);
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
        URL.revokeObjectURL(source.objectUrl);
        sources.delete(id);
        released.add(id);
      });
      setMessages((previous) => abandonUnsentMessages(previous, released, {
        notConfirmed: latestTranslations.current.messageDeliveryNotConfirmed,
        uploadNotSent: latestTranslations.current.uploadNotSent,
      }));
    };
  }, [chatId, setMessages, translationsRef]);

  return { uploadSourcesRef, uploadingRef, releasedRef, releaseSource };
};
