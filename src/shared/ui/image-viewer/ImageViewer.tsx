import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ChevronLeft, ChevronRight, Download, ImageOff, Trash2, ZoomIn, ZoomOut, X } from 'lucide-react';
import { fetchMedia } from '@/shared/api/fetchMedia';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useZoomPan } from './useZoomPan';
import { Button } from '@/shared/ui/button';

const KEY_PAN_STEP = 80;

export interface ViewerImage {
  url: string;
  name: string;
  downloadName?: string;
  onDelete?: () => Promise<void>;
}

interface ImageViewerProps {
  images: ViewerImage[];
  initialIndex?: number;
  onClose: () => void;
}

const stopPropagation = (event: React.SyntheticEvent) => event.stopPropagation();

const clickLink = (href: string, filename: string, newTab = false) => {
  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = href;
  link.download = filename;
  if (newTab) {
    link.target = '_blank';
    link.rel = 'noreferrer';
  }
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const downloadImage = async (image: ViewerImage) => {
  const filename = image.downloadName || image.name;
  try {
    const response = await fetchMedia(image.url, { credentials: 'include' });
    if (!response.ok) throw new Error(`Download failed (${response.status})`);
    const objectUrl = URL.createObjectURL(await response.blob());
    clickLink(objectUrl, filename);
    URL.revokeObjectURL(objectUrl);
  } catch {
    clickLink(image.url, filename, true);
  }
};

const ImageViewer: React.FC<ImageViewerProps> = ({ images, initialIndex = 0, onClose }) => {
  const { translations } = useLanguage();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [isStageMounted, setIsStageMounted] = useState(false);
  const openerRef = useRef(document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const setStage = useCallback((node: HTMLDivElement | null) => {
    stageRef.current = node;
    setIsStageMounted(!!node);
  }, []);
  const imageRef = useRef<HTMLImageElement>(null);
  const [index, setIndex] = useState(() => Math.min(Math.max(initialIndex, 0), Math.max(images.length - 1, 0)));
  const [brokenUrls, setBrokenUrls] = useState<Record<string, true>>({});
  const [isDownloading, setIsDownloading] = useState(false);
  const [deleting, setDeleting] = useState<{ url: string; busy: boolean; failed: boolean } | null>(null);
  const isGallery = images.length > 1;
  const canGoBack = index > 0;
  const canGoForward = index < images.length - 1;
  const image = images[index];

  const go = useCallback((direction: -1 | 1) => {
    setIndex((current) => Math.min(Math.max(current + direction, 0), images.length - 1));
  }, [images.length]);

  const { view, swipeX, isGesturing, movedRef, reset, zoomBy, pan, pointerHandlers } = useZoomPan(
    stageRef, imageRef, isStageMounted, { onSwipe: isGallery ? go : undefined },
  );

  useEffect(() => { reset(); }, [index, reset]);

  useEffect(() => {
    if (images.length === 0) onClose();
    else if (index > images.length - 1) setIndex(images.length - 1);
  }, [images.length, index, onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    const zoomed = view.scale > 1;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === '+' || event.key === '=') zoomBy(1.25);
      else if (event.key === '-' || event.key === '_') zoomBy(0.8);
      else if (event.key === 'ArrowLeft') { if (zoomed) pan(KEY_PAN_STEP, 0); else go(-1); }
      else if (event.key === 'ArrowRight') { if (zoomed) pan(-KEY_PAN_STEP, 0); else go(1); }
      else if (event.key === 'ArrowUp') pan(0, KEY_PAN_STEP);
      else if (event.key === 'ArrowDown') pan(0, -KEY_PAN_STEP);
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [go, onClose, pan, view.scale, zoomBy]);

  const handleStageClick = useCallback((event: React.MouseEvent) => {
    if (movedRef.current || view.scale > 1) return;
    const rect = imageRef.current?.getBoundingClientRect();
    const onImage = rect && event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!onImage) onClose();
  }, [movedRef, onClose, view.scale]);

  if (!image) return null;
  const isBroken = !!brokenUrls[image.url];
  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadImage(image);
    } finally {
      setIsDownloading(false);
    }
  };

  const confirmDelete = async () => {
    if (!image.onDelete) return;
    setDeleting({ url: image.url, busy: true, failed: false });
    try {
      await image.onDelete();
      setDeleting(null);
    } catch {
      setDeleting({ url: image.url, busy: false, failed: true });
    }
  };
  const deleteState = deleting?.url === image.url ? deleting : null;

  const buttonClass = 'p-2 bg-black/30 hover:bg-black/40 rounded-full text-white transition-colors backdrop-blur-sm';
  const sideButtonClass = 'absolute top-1/2 z-[10000] -translate-y-1/2 rounded-full bg-black/30 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/50 disabled:pointer-events-none disabled:opacity-0 sm:p-3';
  const edgeResistance = (!canGoBack && swipeX > 0) || (!canGoForward && swipeX < 0) ? 0.3 : 1;

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          asChild
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement).focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (openerRef.current?.isConnected) openerRef.current.focus({ preventScroll: true });
          }}
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          <div
            aria-label={image.name}
            className="motion-image-viewer-backdrop fixed inset-0 z-[9999] bg-black/70 flex flex-col outline-none"
            style={{ isolation: 'isolate' }}
            onClick={stopPropagation}
            onDoubleClick={stopPropagation}
            onMouseDown={stopPropagation}
            onMouseUp={stopPropagation}
            onPointerDown={stopPropagation}
            onPointerUp={stopPropagation}
            onTouchStart={stopPropagation}
            onTouchEnd={stopPropagation}
            onKeyDown={stopPropagation}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <DialogPrimitive.Title className="sr-only">{image.name}</DialogPrimitive.Title>
            {isGallery && (
              <div aria-live="polite" className="fixed left-4 top-5 z-[10000] rounded-full bg-black/30 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
                {index + 1} / {images.length}
              </div>
            )}
            <div className="fixed top-4 right-4 flex gap-2 z-[10000]">
              <button type="button" onClick={() => zoomBy(1.25)} aria-label={translations.zoomIn || 'Zoom in'} className={buttonClass}>
                <ZoomIn className="w-5 h-5" />
              </button>
              <button type="button" onClick={() => zoomBy(0.8)} aria-label={translations.zoomOut || 'Zoom out'} className={buttonClass}>
                <ZoomOut className="w-5 h-5" />
              </button>
              {!isBroken && (
                <button type="button" disabled={isDownloading} onClick={() => void handleDownload()} aria-label={translations.download || 'Download'} className={`${buttonClass} disabled:opacity-50`}>
                  <Download className={`w-5 h-5 ${isDownloading ? 'animate-pulse' : ''}`} />
                </button>
              )}
              {image.onDelete && (
                <button type="button" onClick={() => setDeleting({ url: image.url, busy: false, failed: false })} aria-label={translations.deletePhoto} className={buttonClass}>
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button type="button" onClick={onClose} aria-label={translations.close || 'Close'} className={buttonClass}>
                <X className="w-5 h-5" />
              </button>
            </div>
            {deleteState && (
              <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/40 p-4" onClick={() => !deleteState.busy && setDeleting(null)}>
                <div role="alertdialog" aria-label={translations.deletePhotoConfirm} onClick={stopPropagation}
                  className="motion-panel-in w-full max-w-sm rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg">
                  <h3 className="mb-2 text-lg font-semibold leading-none tracking-tight">{translations.deletePhotoConfirm}</h3>
                  {deleteState.failed && <p className="text-sm text-destructive">{translations.photoDeleteFailed}</p>}
                  <div className="mt-4 flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDeleting(null)}>{translations.cancel}</Button>
                    <Button type="button" variant="destructive" disabled={deleteState.busy} onClick={() => void confirmDelete()}>{translations.delete}</Button>
                  </div>
                </div>
              </div>
            )}
            {isGallery && (
              <>
                <button type="button" disabled={!canGoBack} onClick={() => go(-1)} aria-label={translations.previousImage} className={`${sideButtonClass} left-2 sm:left-4`}>
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button type="button" disabled={!canGoForward} onClick={() => go(1)} aria-label={translations.nextImage} className={`${sideButtonClass} right-2 sm:right-4`}>
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
            <div
              ref={setStage}
              data-testid="image-viewer-stage"
              className={`flex-1 flex items-center justify-center overflow-hidden p-8 select-none ${view.scale > 1 ? (isGesturing ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
              style={{ touchAction: 'none' }}
              onClick={handleStageClick}
              {...pointerHandlers}
            >
              {isBroken ? (
                <div className="flex flex-col items-center gap-3 text-white/70">
                  <ImageOff className="h-10 w-10" />
                  <span className="text-sm">{translations.failedToLoadImage || 'Failed to load image'}</span>
                </div>
              ) : (
                <AuthenticatedImage
                  key={image.url}
                  ref={imageRef}
                  src={image.url}
                  alt={image.name}
                  className="max-h-[80vh] max-w-[80vw] select-none object-contain rounded-lg"
                  style={{
                    transform: `translate(${view.x + swipeX * edgeResistance}px, ${view.y}px) scale(${view.scale})`,
                    transition: isGesturing ? 'none' : 'transform 0.2s',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    pointerEvents: 'none',
                  }}
                  draggable={false}
                  onError={() => setBrokenUrls((current) => ({ ...current, [image.url]: true }))}
                />
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default ImageViewer;
