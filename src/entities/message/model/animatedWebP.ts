import type { MessageAttachment } from './types';

const MAX_ANIMATED_WEBP_BYTES = 8 << 20;

export const mayBeAnimatedWebP = (item: Pick<MessageAttachment, 'file_type' | 'display_url' | 'file_size'>) => (
  item.file_type === 'image/webp' && !item.display_url && item.file_size <= MAX_ANIMATED_WEBP_BYTES
);
