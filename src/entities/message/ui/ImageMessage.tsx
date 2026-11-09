import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import React, { useState, useRef, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { getImageDimensions, rememberImageDimensions } from '../../../shared/lib/imageDimensions';
import { ImageViewer, type ViewerImageInfo } from '@/shared/ui/image-viewer';
import { useMediaPreload } from '@/shared/api/useMediaPreload';
import { VideoPlayBadge } from '@/shared/ui/VideoPlayBadge';
import { MediaVisual } from './MediaVisual';
import { DrawingOverlay, type Drawing } from '@/shared/ui/drawing';

const MAX_HEIGHT = 300;
const MAX_WIDTH = 300;
const PLACEHOLDER = { width: 240, height: 180 };
const VIDEO_PLACEHOLDER = { width: 16, height: 10 };

interface ImageMessageProps {
  fileUrl: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  fileName: string;
  isMine: boolean;
  isVideo?: boolean;
  onBroken?: () => void;
  onReply?: () => void;
  viewerInfo?: ViewerImageInfo;
  drawing?: Drawing | null;
  onDraw?: (onSent?: () => void) => void;
}

const ImageMessage: React.FC<ImageMessageProps> = ({
  fileUrl, thumbnailUrl, width, height, fileName, isVideo = false, onBroken, onReply, viewerInfo, drawing, onDraw,
}) => {
  const { translations } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const knownSize = width && height && width > 0 && height > 0 ? { width, height } : undefined;
  const [dimensions, setDimensions] = useState(() => knownSize ?? (isVideo ? undefined : getImageDimensions(fileUrl)));
  const [isLoaded, setIsLoaded] = useState(false);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const previewUrl = thumbnailUrl && !thumbnailFailed ? thumbnailUrl : fileUrl;
  const preloadHandlers = useMediaPreload(isVideo ? undefined : fileUrl);

  const closeViewer = useCallback(() => setIsExpanded(false), []);
  const markLoaded = useCallback(() => setIsLoaded(true), []);
  const open = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsExpanded(true);
  };

  const shape = knownSize ?? dimensions;
  const box = shape ?? (isVideo ? VIDEO_PLACEHOLDER : PLACEHOLDER);
  const aspect = shape ? shape.width / shape.height : undefined;
  const visualClass = `block h-full w-full select-none rounded-2xl object-cover transition-opacity duration-150 ${isLoaded ? 'opacity-100' : 'opacity-0'}`;

  return (
    <>
      <div
        className={`relative group max-w-full overflow-hidden rounded-2xl ${isVideo ? 'bg-muted' : ''}`}
        style={{
          width: `${Math.min(MAX_WIDTH, MAX_HEIGHT * (box.width / box.height))}px`,
          aspectRatio: `${box.width} / ${box.height}`,
        }}
      >
        {isVideo ? (
          <button type="button" onClick={open} title={fileName} aria-label={`${translations.playVideo} ${fileName}`}
            className="block h-full w-full cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
            <MediaVisual url={fileUrl} poster={thumbnailUrl} isVideo className={visualClass} onReady={markLoaded}
              onVideoSize={(videoWidth, videoHeight) => {
                if (!knownSize && videoWidth && videoHeight) setDimensions({ width: videoWidth, height: videoHeight });
              }} />
            <VideoPlayBadge className="absolute inset-0 m-auto transition-transform duration-200 group-hover:scale-110" />
          </button>
        ) : (
          <AuthenticatedImage
            ref={imageRef}
            src={previewUrl}
            alt={fileName}
            loading="lazy"
            decoding="async"
            width={box.width}
            height={box.height}
            onLoad={(e) => {
              setIsLoaded(true);
              const { naturalWidth, naturalHeight } = e.currentTarget;
              if (knownSize || !naturalWidth || !naturalHeight) return;
              if (previewUrl === fileUrl) rememberImageDimensions(fileUrl, naturalWidth, naturalHeight);
              else if (dimensions && Math.abs(dimensions.width / dimensions.height - naturalWidth / naturalHeight) < 0.01) return;
              if (!dimensions || dimensions.width !== naturalWidth || dimensions.height !== naturalHeight) {
                setDimensions({ width: naturalWidth, height: naturalHeight });
              }
            }}
            onError={() => {
              if (previewUrl !== fileUrl) setThumbnailFailed(true);
              else {
                setIsLoaded(true);
                onBroken?.();
              }
            }}
            {...preloadHandlers}
            onClick={open}
            className={`${visualClass} cursor-pointer`}
            style={{
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
            draggable={false}
          />
        )}
        {!isVideo && isLoaded && <DrawingOverlay drawing={drawing} aspect={aspect} />}
        {onReply && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-black/30 opacity-0 transition-opacity group-hover:opacity-100 [@media(hover:none)]:hidden">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReply();
              }}
              aria-label={translations.replyToMessage || 'Reply'}
              className="pointer-events-auto p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors backdrop-blur-sm"
            >
              <MessageSquare className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <ImageViewer
          images={[{
            url: fileUrl, name: fileName, isVideo, previewUrl: thumbnailFailed ? undefined : thumbnailUrl, info: viewerInfo,
            drawing, aspect, onDraw: onDraw && (() => onDraw(() => setIsExpanded(false))),
          }]}
          onClose={closeViewer}
        />
      )}
    </>
  );
};

export default ImageMessage;
