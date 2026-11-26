import { useMemo } from 'react';
import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import { useCurrentUsername } from '@/shared/contexts/CurrentUsernameContext';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useGetChatPhotosQuery } from '../api/messageApi';
import { chatGalleryEntries } from './chatGallery';

export const useChatGalleryEntries = (chatId: EntityId | undefined, enabled: boolean) => {
  const { translations } = useLanguage();
  const me = useCurrentUsername().toLowerCase();
  const persisted = chatId !== undefined && isPersistedId(chatId);
  const { data } = useGetChatPhotosQuery(persisted ? chatId : 0, { skip: !persisted || !enabled, refetchOnMountOrArgChange: 30 });
  const fromYou = translations.replyFromYou;
  return useMemo(() => chatGalleryEntries(data?.photos ?? [], (photo) => ({
    sender: me && photo.sender_username?.toLowerCase() === me ? fromYou : photo.sender ?? '',
    avatarName: photo.sender, avatarUrl: photo.avatar_url, sentAt: photo.timestamp,
  })), [data, fromYou, me]);
};
