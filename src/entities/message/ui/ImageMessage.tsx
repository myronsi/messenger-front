import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import React, { useState, useRef, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { getImageDimensions, rememberImageDimensions } from '../../../shared/lib/imageDimensions';
import { ImageViewer } from '@/shared/ui/image-viewer';

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
  const imageRef = useRef<HTMLImageElement>(null);
  const knownSize = width && height && width > 0 && height > 0 ? { width, height } : undefined;
  const [dimensions, setDimensions] = useState(() => knownSize ?? getImageDimensions(fileUrl));
  const [isLoaded, setIsLoaded] = useState(false);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const previewUrl = thumbnailUrl && !thumbnailFailed ? thumbnailUrl : fileUrl;

  const closeViewer = useCallback(() => setIsExpanded(false), []);

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

      {isExpanded && (
        <ImageViewer images={[{ url: fileUrl, name: fileName }]} onClose={closeViewer} />
      )}
    </>
  );
};

export default ImageMessage;
