import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download, ZoomIn, ZoomOut, MessageSquare, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { getImageDimensions, rememberImageDimensions } from '../../../shared/lib/imageDimensions';
import MediaImg from '@/shared/ui/MediaImg';

const MAX_HEIGHT = 300;
const PLACEHOLDER = { width: 240, height: 180 };

interface ImageMessageProps {
  fileUrl: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  fileName: string;
  isMine: boolean;
  onReply?: () => void;
}

const ImageMessage: React.FC<ImageMessageProps> = ({ fileUrl, thumbnailUrl, width, height, fileName, onReply }) => {
  const { translations } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [scale, setScale] = useState(1);
  const imageRef = useRef<HTMLImageElement>(null);
  const knownSize = width && height && width > 0 && height > 0 ? { width, height } : undefined;
  const [dimensions, setDimensions] = useState(() => knownSize ?? getImageDimensions(fileUrl));
  const [isLoaded, setIsLoaded] = useState(false);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const previewUrl = thumbnailUrl && !thumbnailFailed ? thumbnailUrl : fileUrl;
  const modalRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const resetView = useCallback(() => {
    document.body.style.overflow = 'auto';
    setIsExpanded(false);
    setScale(1);
  }, []);

  const handleZoom = useCallback((factor: number) => {
    setScale(prev => {
      const newScale = prev * factor;
      return Math.min(Math.max(newScale, 0.5), 3);
    });
  }, []);

  const handleDownload = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading) return;

    setIsDownloading(true);
    try {
      const downloadName = fileName;
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = fileUrl;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  }, [fileUrl, fileName, isDownloading]);

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (!isExpanded) return;
    if (e.key === '+' || e.key === '=') handleZoom(1.2);
    if (e.key === '-' || e.key === '_') handleZoom(0.8);
    if (e.key === 'Escape') resetView();
  }, [isExpanded, handleZoom, resetView]);

  useEffect(() => {
    if (isExpanded) {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [isExpanded, handleKeyPress]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.8 : 1.2;
    handleZoom(factor);
  }, [handleZoom]);

  const handleModalClick = useCallback((e: React.MouseEvent) => {
    if (e.target === modalRef.current && scale <= 1) {
      resetView();
    }
  }, [resetView, scale]);

  const handleDoubleClick = useCallback(() => {
    setScale(prev => prev === 1 ? 2 : 1);
  }, []);

  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isExpanded]);

  const box = knownSize ?? dimensions ?? PLACEHOLDER;

  return (
    <>
      <div
        className="relative group max-w-full overflow-hidden rounded-2xl"
        style={{
          width: `${Math.min(box.width, MAX_HEIGHT * (box.width / box.height))}px`,
          aspectRatio: `${box.width} / ${box.height}`,
        }}
      >
        <MediaImg
          ref={imageRef}
          src={previewUrl}
          alt={fileName}
          loading="lazy"
          decoding="async"
          width={box.width}
          height={box.height}
          onLoad={(e) => {
            setIsLoaded(true);
            if (knownSize || previewUrl !== fileUrl) return;
            const { naturalWidth, naturalHeight } = e.currentTarget;
            rememberImageDimensions(fileUrl, naturalWidth, naturalHeight);
            if (!dimensions || dimensions.width !== naturalWidth || dimensions.height !== naturalHeight) {
              setDimensions({ width: naturalWidth, height: naturalHeight });
            }
          }}
          onError={() => {
            if (previewUrl !== fileUrl) setThumbnailFailed(true);
            else setIsLoaded(true);
          }}
          onClick={() => setIsExpanded(true)}
          className={`block h-full w-full select-none rounded-2xl cursor-pointer object-cover transition-opacity duration-150 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
          draggable={false}
        />
        {onReply && (
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 flex items-center justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReply();
              }}
              aria-label={translations.replyToMessage || 'Reply'}
              className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors backdrop-blur-sm"
            >
              <MessageSquare className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      
      {isExpanded && createPortal(
        <div 
          ref={modalRef}
          className="fixed inset-0 z-[9999] bg-black/70 flex flex-col"
          onClick={handleModalClick}
          onContextMenu={e => e.preventDefault()}
          style={{ 
            isolation: 'isolate',
            touchAction: 'none'
          }}
        >
          <div className="fixed top-4 right-4 flex gap-2 z-[10000]">
            <button
              onClick={() => handleZoom(1.2)}
              aria-label={translations.zoomIn || 'Zoom in'}
              className="p-2 bg-black/30 hover:bg-black/40 rounded-full text-white transition-colors backdrop-blur-sm"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleZoom(0.8)}
              aria-label={translations.zoomOut || 'Zoom out'}
              className="p-2 bg-black/30 hover:bg-black/40 rounded-full text-white transition-colors backdrop-blur-sm"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              aria-label={translations.download || 'Download'}
              className="p-2 bg-black/30 hover:bg-black/40 rounded-full text-white transition-colors backdrop-blur-sm disabled:opacity-50"
            >
              <Download className={`w-5 h-5 ${isDownloading ? 'animate-pulse' : ''}`} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                resetView();
              }}
              aria-label={translations.close || 'Close'}
              className="p-2 bg-black/30 hover:bg-black/40 rounded-full text-white transition-colors backdrop-blur-sm"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div 
            className="flex-1 flex items-center justify-center p-8"
            onWheel={handleWheel}
            onContextMenu={e => e.preventDefault()}
          >
            <MediaImg
              src={fileUrl}
              alt={fileName}
              className="max-h-[80vh] max-w-[80vw] select-none object-contain rounded-lg"
              style={{ 
                transform: `scale(${scale})`,
                transition: 'transform 0.2s',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                pointerEvents: 'none'
              }}
              draggable={false}
              onDoubleClick={handleDoubleClick}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default ImageMessage;