import { createContext, useCallback, useContext } from 'react';
import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import type { ViewerImage, ViewerImageInfo } from '@/shared/ui/image-viewer';
import { normalizeProfileMediaUrl } from './profileMedia';
import { isVideoAttachment } from './videoAttachment';
import { attachmentAspect } from './drawAction';
import { makeStickerAction } from './stickerSource';
import { requestMediaForward } from './mediaForward';
import type { ChatPhoto, MessageAttachment } from './types';

export interface GalleryEntry {
  messageId: EntityId;
  url: string;
  image: ViewerImage;
}

const photoAttachment = (photo: ChatPhoto): MessageAttachment => ({
  ...photo, file_url: photo.file_url || photo.url || '', file_name: photo.file_name || photo.name || '',
  file_type: photo.file_type || '', file_size: photo.file_size ?? 0,
});

const galleryEntry = (messageId: EntityId, item: MessageAttachment, info: ViewerImageInfo): GalleryEntry | null => {
  if (!item.file_url) return null;
  const url = normalizeProfileMediaUrl(item.file_url);
  const isVideo = isVideoAttachment(item);
  const display = !isVideo && item.display_url ? normalizeProfileMediaUrl(item.display_url) : undefined;
  return {
    messageId, url,
    image: {
      url: display ?? url, fullUrl: display ? url : undefined, name: item.file_name, downloadName: item.file_name || undefined,
      previewUrl: item.thumbnail_url ? normalizeProfileMediaUrl(item.thumbnail_url) : undefined,
      isVideo, info, drawing: item.drawing, aspect: attachmentAspect(item), onMakeSticker: makeStickerAction(item),
    },
  };
};

export const chatGalleryEntries = (photos: ChatPhoto[], infoFor: (photo: ChatPhoto) => ViewerImageInfo): GalleryEntry[] => (
  [...photos].reverse()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .flatMap((photo) => {
      const info = infoFor(photo);
      const items = photo.album?.length ? photo.album : [photoAttachment(photo)];
      return items.map((item) => galleryEntry(photo.id, item, info)).filter((entry): entry is GalleryEntry => !!entry);
    })
);

export interface OpenGallery {
  images: ViewerImage[];
  index: number;
  messageIds: EntityId[];
}

export const galleryFor = (entries: GalleryEntry[], messageId: EntityId, local: ViewerImage[], localUrls: string[], localIndex: number): OpenGallery => {
  const own = (entry: GalleryEntry) => String(entry.messageId) === String(messageId);
  const index = entries.findIndex((entry) => own(entry) && entry.url === localUrls[localIndex]);
  if (index < 0) return { images: local, index: localIndex, messageIds: local.map(() => messageId) };
  const images = entries.map((entry) => {
    const at = own(entry) ? localUrls.indexOf(entry.url) : -1;
    return at >= 0 ? local[at] : entry.image;
  });
  return { images, index, messageIds: entries.map((entry) => entry.messageId) };
};

export const ChatGalleryContext = createContext<GalleryEntry[]>([]);

export const useGalleryOpener = (messageId: EntityId | undefined, close: () => void) => {
  const entries = useContext(ChatGalleryContext);
  return useCallback((local: ViewerImage[], localUrls: string[], localIndex: number): OpenGallery => {
    const opened = messageId === undefined
      ? { images: local, index: localIndex, messageIds: [] }
      : galleryFor(entries, messageId, local, localUrls, localIndex);
    const images = opened.images.map((image, at) => {
      const id = opened.messageIds[at];
      const { onMakeSticker } = image;
      return {
        ...image,
        onMakeSticker: onMakeSticker && (() => { close(); onMakeSticker(); }),
        onForward: id !== undefined && isPersistedId(id) ? () => { close(); requestMediaForward(id); } : undefined,
      };
    });
    return { ...opened, images };
  }, [close, entries, messageId]);
};
