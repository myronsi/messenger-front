import { isPersistedId, type EntityId } from '@/shared/api/entityId';
import type { ImageDrawingContextValue } from '@/shared/ui/drawing';
import type { MessageAttachment } from './types';

export const attachmentAspect = (item: Pick<MessageAttachment, 'image_width' | 'image_height'>) => (
  item.image_width && item.image_height ? item.image_width / item.image_height : undefined
);

export const drawActionFor = (context: ImageDrawingContextValue | null, messageId: EntityId, item: MessageAttachment, url: string) => {
  const attachmentId = item.attachment_id;
  if (!context || !attachmentId || !isPersistedId(messageId)) return undefined;
  return (onSent?: () => void) => context.drawOnImage({
    messageId, attachmentId, url, name: item.file_name, aspect: attachmentAspect(item), drawing: item.drawing, onSent,
  });
};
