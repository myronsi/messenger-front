import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ImageOff, Loader2, VideoOff } from 'lucide-react';
import { preloadMedia } from '@/shared/api/mediaCache';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useZoomPan } from './useZoomPan';
import { downloadImage } from './downloadImage';
import { isOnPicture, type ViewerMedia } from './pictureRect';
import { ViewerVideo, type VideoTap } from './ViewerVideo';
import { handleVideoKey } from './videoPlayback';
import { ViewerToolbar } from './ViewerToolbar';
import { DeleteImageConfirm } from './DeleteImageConfirm';
import { NeighborSlide } from './NeighborSlide';
import { useGallerySwipe } from './useGallerySwipe';
import { useSwipeDismiss } from './useSwipeDismiss';
import { useSwipeMorph } from './useSwipeMorph';
import { useFadeClose } from './useFadeClose';
import { useViewerChrome } from './useViewerChrome';
import { BackToClose } from '@/shared/ui/BackToClose';
import { mobileImageDirection } from './mobileImageDirection';
import { MobileGalleryEdges } from './MobileGalleryEdges';
import { GalleryArrows } from './GalleryArrows';
import ImageViewerHeader from './ImageViewerHeader';
import { DrawingOverlay } from '@/shared/ui/drawing';
import type { ViewerImage } from './viewerTypes';
export type { ViewerImage } from './viewerTypes';
const KEY_PAN_STEP = 80;
const FULL_SCREEN_MEDIA = 'absolute inset-0 h-full w-full max-w-none select-none object-contain';
interface ImageViewerProps {
  images: ViewerImage[];
  initialIndex?: number;
  onClose: () => void;
}
const stopPropagation = (event: React.SyntheticEvent) => event.stopPropagation();
const naturalAspect = (media: ViewerMedia | null) => (
  media instanceof HTMLImageElement && media.naturalHeight ? media.naturalWidth / media.naturalHeight : undefined
);
const preloadSource = (item?: ViewerImage) => (item?.isVideo ? item.previewUrl : item?.url);
const ImageViewer: React.FC<ImageViewerProps> = ({ images, initialIndex = 0, onClose }) => {
  const { translations } = useLanguage();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isStageMounted, setIsStageMounted] = useState(false);
  const openerRef = useRef(document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const setStage = useCallback((node: HTMLDivElement | null) => {
    stageRef.current = node;
    setIsStageMounted(!!node);
  }, []);
  const imageRef = useRef<ViewerMedia | null>(null);
  const [index, setIndex] = useState(() => Math.min(Math.max(initialIndex, 0), Math.max(images.length - 1, 0)));
  const [brokenUrls, setBrokenUrls] = useState<Record<string, true>>({});
  const [loadedUrls, setLoadedUrls] = useState<Record<string, true>>({});
  const [isDownloading, setIsDownloading] = useState(false);
  const [deleting, setDeleting] = useState<{ url: string; busy: boolean; failed: boolean } | null>(null);
  const isGallery = images.length > 1;
  const canGoBack = index > 0;
  const canGoForward = index < images.length - 1;
  const image = images[index];
  const go = useCallback((direction: -1 | 1) => {
    setIndex((current) => Math.min(Math.max(current + direction, 0), images.length - 1));
  }, [images.length]);
  const onSwipe = useGallerySwipe(stageRef, index, images.length, go);
  const fadeClose = useFadeClose(stageRef, onClose);
  const chrome = useViewerChrome();
  const onDismiss = useSwipeDismiss(stageRef, onClose, [image?.thumbnailSource, image?.url, image?.previewUrl]);
  const { view, swipeX, swipeY, isGesturing, movedRef, reset, zoomBy, pan, pointerHandlers } = useZoomPan(
    stageRef, imageRef, isStageMounted, { onSwipe: isGallery ? onSwipe : undefined, onDismiss, tapZoom: !image?.isVideo },
  );
  useSwipeMorph(stageRef, swipeY, [image?.thumbnailSource, image?.url, image?.previewUrl]);
  useEffect(() => { reset(); }, [index, reset]);
  const markLoaded = useCallback((url: string) => {
    setLoadedUrls((loaded) => (loaded[url] ? loaded : { ...loaded, [url]: true }));
  }, []);
  const currentUrl = images[index]?.url;
  const setVideo = useCallback((node: HTMLVideoElement | null) => {
    imageRef.current = node;
  }, []);
  const setImage = useCallback((node: HTMLImageElement | null) => {
    imageRef.current = node;
    if (node && currentUrl && node.getAttribute('src') && node.complete && node.naturalWidth > 0) markLoaded(currentUrl);
  }, [currentUrl, markLoaded]);
  useEffect(() => {
    const cancelNext = preloadMedia(preloadSource(images[index + 1]));
    const cancelPrevious = preloadMedia(preloadSource(images[index - 1]));
    return () => { cancelNext(); cancelPrevious(); };
  }, [images, index]);
  useEffect(() => {
    if (images.length === 0) onClose();
    else if (index > images.length - 1) setIndex(images.length - 1);
  }, [images.length, index, onClose]);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);
  const confirmingRef = useRef(false);
  confirmingRef.current = !!deleting;
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const wasConfirmingRef = useRef(false);
  useEffect(() => {
    if (wasConfirmingRef.current && !deleting && deleteButtonRef.current?.isConnected) deleteButtonRef.current.focus({ preventScroll: true });
    wasConfirmingRef.current = !!deleting;
  }, [deleting]);
  useEffect(() => {
    const zoomed = view.scale > 1;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest('[role="dialog"]') && !rootRef.current?.contains(event.target)) return;
      if (confirmingRef.current) {
        if (event.key === 'Escape') {
          event.preventDefault();
          setDeleting((current) => (current?.busy ? current : null));
        }
        return;
      }
      if (handleVideoKey(event, imageRef.current)) return;
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
  const previewRef = useRef<HTMLImageElement>(null);
  const videoTapRef = useRef<VideoTap | null>(null);
  const handleStageClick = useCallback((event: React.MouseEvent) => {
    if (event.target instanceof Element && event.target.closest('[data-viewer-controls]')) return;
    if (movedRef.current) { chrome.cancel(); return; }
    const media = imageRef.current;
    const touch = (event.nativeEvent as PointerEvent).pointerType === 'touch' || window.innerWidth < 640;
    if (media instanceof HTMLVideoElement && touch) { videoTapRef.current?.(event.clientX, event.clientY, true); return; }
    const direction = isGallery && view.scale === 1 ? mobileImageDirection(event.clientX, stageRef.current) : null;
    if (direction) { onSwipe(direction, 0); return; }
    if (!(media instanceof HTMLVideoElement)) chrome.toggleSoon();
    else if (isOnPicture([media, previewRef.current], event.clientX, event.clientY)) videoTapRef.current?.(event.clientX, event.clientY, false);
    else chrome.toggleNow();
  }, [movedRef, chrome, view.scale, isGallery, onSwipe]);
  if (!image) return null;
  const isBroken = !!brokenUrls[image.url];
  const isVideo = !!image.isVideo;
  const isLoaded = !!loadedUrls[image.url];
  const previewUrl = image.previewUrl && image.previewUrl !== image.url ? image.previewUrl : undefined;
  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadImage(image.url, image.downloadName || image.name, image.drawing);
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
  const edgeResistance = (!canGoBack && swipeX > 0) || (!canGoForward && swipeX < 0) ? 0.3 : 1;
  const mainClass = `${FULL_SCREEN_MEDIA} ${isLoaded ? 'opacity-100' : 'opacity-0'}`;
  const markCurrentLoaded = () => markLoaded(image.url);
  const markCurrentBroken = () => setBrokenUrls((current) => ({ ...current, [image.url]: true }));
  const mediaStyle: React.CSSProperties = {
    transform: `translate(${view.x + swipeX * edgeResistance}px, ${view.y + swipeY}px) scale(${view.scale * Math.max(0.65, 1 - swipeY / window.innerHeight * 0.5)})`,
    transition: isGesturing ? 'opacity 0.15s' : 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1), opacity 0.15s',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    backfaceVisibility: 'hidden', willChange: isGesturing ? 'transform' : undefined,
    pointerEvents: 'none',
  };
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
            ref={rootRef}
            aria-label={image.name}
            className="motion-image-viewer-backdrop fixed inset-0 z-[9999] bg-black flex flex-col outline-none [-webkit-tap-highlight-color:transparent]"
            style={{ isolation: 'isolate', backgroundColor: `rgba(0, 0, 0, ${Math.max(0, 1 - swipeY / Math.max(1, window.innerHeight * 0.65))})`, transition: isGesturing ? 'none' : 'background-color 240ms ease-out' }}
            onClick={stopPropagation}
            onDoubleClick={stopPropagation}
            onMouseDown={stopPropagation}
            onMouseUp={stopPropagation}
            onPointerDown={stopPropagation}
            onPointerUp={stopPropagation}
            onTouchStart={stopPropagation}
            onTouchEnd={stopPropagation}
            onKeyDown={stopPropagation}
            onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); }}
          >
            <BackToClose onClose={fadeClose} flag="imageViewer" />
            <DialogPrimitive.Title className="sr-only">{image.name}</DialogPrimitive.Title>
            <div data-testid="image-viewer-chrome" inert={!chrome.visible} aria-hidden={!chrome.visible || undefined}
              className={`pointer-events-none fixed inset-0 z-[10000] transition-opacity duration-200 ease-out ${chrome.visible ? 'opacity-100' : 'opacity-0'}`}>
            <ImageViewerHeader info={image.info} index={index} total={images.length} onShowInChat={image.onShowInChat} onClose={onClose} />
            <ViewerToolbar
              canDownload={!isBroken || isVideo} isDownloading={isDownloading} deleteButtonRef={deleteButtonRef}
              onZoom={zoomBy} onDownload={() => void handleDownload()} onClose={fadeClose} onDraw={!isBroken && !isVideo ? image.onDraw : undefined}
              onDelete={image.onDelete ? () => setDeleting({ url: image.url, busy: false, failed: false }) : undefined}
            />
            {deleteState && (
              <DeleteImageConfirm
                busy={deleteState.busy} failed={deleteState.failed} onCancel={() => setDeleting(null)} onConfirm={() => void confirmDelete()}
              />
            )}
            {isGallery && <GalleryArrows canGoBack={canGoBack} canGoForward={canGoForward} onGo={(direction) => onSwipe(direction, 0)} />}
            </div>
            <div
              ref={setStage}
              data-testid="image-viewer-stage"
              className={`relative flex-1 flex items-center justify-center overflow-hidden select-none ${view.scale > 1 ? (isGesturing ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
              style={{ touchAction: 'none' }}
              onClick={handleStageClick}
              {...pointerHandlers}
            >
              {isGallery && !image.isVideo && <MobileGalleryEdges previous={canGoBack} next={canGoForward} zoomed={view.scale > 1 || !chrome.visible} />}
              {view.scale === 1 && ([-1, 1] as const).map((direction) => {
                const neighbor = images[index + direction];
                if (!neighbor) return null;
                return (
                  <NeighborSlide
                    key={`${index + direction}:${neighbor.url}`}
                    image={neighbor} direction={direction} offset={swipeX * edgeResistance}
                    gesturing={isGesturing} broken={!!brokenUrls[neighbor.url]}
                    onLoad={() => markLoaded(neighbor.url)}
                    onError={() => setBrokenUrls((current) => ({ ...current, [neighbor.url]: true }))}
                  />
                );
              })}
              {isBroken ? (
                <div className="flex max-w-xs flex-col items-center gap-3 px-6 text-center text-white/70">
                  {isVideo ? <VideoOff className="h-10 w-10" /> : <ImageOff className="h-10 w-10" />}
                  <span className="text-sm">{isVideo ? translations.videoPlaybackFailed : (translations.failedToLoadImage || 'Failed to load image')}</span>
                </div>
              ) : (
                <>
                  {!isLoaded && (previewUrl ? (
                    <AuthenticatedImage
                      key={previewUrl} ref={previewRef} src={previewUrl} alt="" aria-hidden="true"
                      data-testid="image-viewer-preview" data-active-slide
                      className={`pointer-events-none ${FULL_SCREEN_MEDIA}`}
                      style={{ transform: `translate(${swipeX * edgeResistance}px, ${swipeY}px) scale(${Math.max(0.65, 1 - swipeY / window.innerHeight * 0.5)})` }}
                      draggable={false}
                    />
                  ) : isVideo ? null : (
                    <Loader2 data-testid="image-viewer-loading" className="pointer-events-none absolute inset-0 m-auto h-6 w-6 animate-spin text-white/50" />
                  ))}
                  {isVideo ? (
                    <ViewerVideo
                      key={image.url} url={image.url} name={image.name} poster={previewUrl}
                      loaded={isLoaded} idle={swipeX === 0 && swipeY === 0} tapRef={videoTapRef} mediaRef={setVideo}
                      controlsVisible={chrome.visible} onSingleTap={chrome.toggleNow}
                      className={mainClass}
                      style={mediaStyle}
                      onLoad={markCurrentLoaded} onError={markCurrentBroken}
                    />
                  ) : (
                    <AuthenticatedImage
                      key={image.url} ref={setImage} src={image.url} alt={image.name} data-active-slide
                      className={mainClass} style={mediaStyle} draggable={false}
                      onLoad={markCurrentLoaded} onError={markCurrentBroken}
                    />
                  )}
                  {isLoaded && !isVideo && <DrawingOverlay drawing={image.drawing} aspect={image.aspect ?? naturalAspect(imageRef.current)} fit="contain"
                    className="pointer-events-none absolute inset-0 h-full w-full" style={mediaStyle} />}
                </>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
export default ImageViewer;
