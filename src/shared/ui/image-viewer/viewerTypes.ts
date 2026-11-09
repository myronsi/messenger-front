import type { Drawing } from '@/shared/ui/drawing';
import type { ViewerImageInfo } from './ImageViewerHeader';

export interface ViewerImage {
  url: string;
  name: string;
  downloadName?: string;
  previewUrl?: string;
  isVideo?: boolean;
  thumbnailSource?: string;
  info?: ViewerImageInfo;
  drawing?: Drawing | null;
  aspect?: number;
  onDraw?: () => void;
  onShowInChat?: () => void;
  onDelete?: () => Promise<void>;
}
