import { createContext, useContext } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import type { Drawing } from './model';

export interface ImageDrawingTarget {
  messageId: EntityId;
  attachmentId: string;
  url: string;
  name: string;
  aspect?: number;
  drawing?: Drawing | null;
  onSent?: () => void;
}

export interface ImageDrawingContextValue {
  drawOnImage: (target: ImageDrawingTarget) => void;
}

export const ImageDrawingContext = createContext<ImageDrawingContextValue | null>(null);

export const useImageDrawing = () => useContext(ImageDrawingContext);
