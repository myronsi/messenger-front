import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';

interface AvatarCropModalProps {
  file: File;
  imageUrl: string;
  isUploading?: boolean;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

const AVATAR_SIZE = 512;
const CROP_VIEW_SIZE = 280;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

const getDisplaySize = (width: number, height: number, zoom: number) => {
  const baseScale = Math.max(CROP_VIEW_SIZE / width, CROP_VIEW_SIZE / height);
  return {
    width: width * baseScale * zoom,
    height: height * baseScale * zoom,
  };
};

const clampOffset = (offset: { x: number; y: number }, size: { width: number; height: number } | null, zoom: number) => {
  if (!size) return offset;
  const displaySize = getDisplaySize(size.width, size.height, zoom);
  const maxX = Math.max(0, (displaySize.width - CROP_VIEW_SIZE) / 2);
  const maxY = Math.max(0, (displaySize.height - CROP_VIEW_SIZE) / 2);

  return {
    x: Math.min(maxX, Math.max(-maxX, offset.x)),
    y: Math.min(maxY, Math.max(-maxY, offset.y)),
  };
};

const createCroppedAvatar = async (imageUrl: string, sourceFile: File, zoom: number, offset: { x: number; y: number }) => {
  const image = await loadImage(imageUrl);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);

  const { width: displayWidth, height: displayHeight } = getDisplaySize(image.naturalWidth, image.naturalHeight, zoom);
  const displayX = (CROP_VIEW_SIZE - displayWidth) / 2 + offset.x;
  const displayY = (CROP_VIEW_SIZE - displayHeight) / 2 + offset.y;
  const scaleToCanvas = AVATAR_SIZE / CROP_VIEW_SIZE;

  context.drawImage(
    image,
    displayX * scaleToCanvas,
    displayY * scaleToCanvas,
    displayWidth * scaleToCanvas,
    displayHeight * scaleToCanvas
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error('Failed to crop avatar'));
    }, 'image/jpeg', 0.92);
  });

  const filename = sourceFile.name.replace(/\.[^.]+$/, '') || 'avatar';
  return new File([blob], `${filename}-cropped.jpg`, { type: 'image/jpeg' });
};

const AvatarCropModal: React.FC<AvatarCropModalProps> = ({ file, imageUrl, isUploading, onCancel, onConfirm }) => {
  const { translations } = useLanguage();
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isCropping, setIsCropping] = useState(false);
  const [sourceSize, setSourceSize] = useState<{ width: number; height: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  const imageStyle = useMemo(() => {
    if (!sourceSize) {
      return { height: '100%', width: '100%', left: 0, top: 0 };
    }

    const displaySize = getDisplaySize(sourceSize.width, sourceSize.height, zoom);
    return {
      height: `${displaySize.height}px`,
      width: `${displaySize.width}px`,
      left: `${(CROP_VIEW_SIZE - displaySize.width) / 2 + offset.x}px`,
      top: `${(CROP_VIEW_SIZE - displaySize.height) / 2 + offset.y}px`,
    };
  }, [offset.x, offset.y, sourceSize, zoom]);

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    loadImage(imageUrl)
      .then((image) => setSourceSize({ width: image.naturalWidth, height: image.naturalHeight }))
      .catch(() => setSourceSize(null));
  }, [file, imageUrl]);

  useEffect(() => {
    setOffset((currentOffset) => clampOffset(currentOffset, sourceSize, zoom));
  }, [sourceSize, zoom]);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start) return;
    setOffset(clampOffset({
      x: start.offsetX + event.clientX - start.x,
      y: start.offsetY + event.clientY - start.y,
    }, sourceSize, zoom));
  };

  const handleConfirm = async () => {
    setIsCropping(true);
    try {
      const croppedFile = await createCroppedAvatar(imageUrl, file, zoom, offset);
      onConfirm(croppedFile);
    } finally {
      setIsCropping(false);
    }
  };

  const isBusy = isUploading || isCropping;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget && !isBusy) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {translations.cropProfilePicture || 'Crop profile picture'}
          </h3>
          <button
            onClick={onCancel}
            disabled={isBusy}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
            aria-label="Close crop dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div
            className="relative h-[280px] w-[280px] touch-none overflow-hidden rounded-lg bg-gray-950"
            onPointerDown={(event) => {
              if (isBusy) return;
              dragStartRef.current = {
                x: event.clientX,
                y: event.clientY,
                offsetX: offset.x,
                offsetY: offset.y,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={(event) => {
              dragStartRef.current = null;
              event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerCancel={() => {
              dragStartRef.current = null;
            }}
          >
            <img
              src={imageUrl}
              alt="Avatar crop preview"
              className="absolute max-w-none select-none object-cover"
              draggable={false}
              style={imageStyle}
            />
            <div className="pointer-events-none absolute inset-0 bg-black/35" />
            <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-white shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" />
          </div>

          <label className="w-full text-sm font-medium text-gray-700">
            {translations.zoom || 'Zoom'}
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              disabled={isBusy}
              onChange={(event) => {
                const nextZoom = Number(event.target.value);
                setZoom(nextZoom);
                setOffset((currentOffset) => clampOffset(currentOffset, sourceSize, nextZoom));
              }}
              className="mt-2 w-full accent-blue-500"
            />
          </label>

          <div className="flex w-full gap-3">
            <button
              onClick={onCancel}
              disabled={isBusy}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {translations.cancel || 'Cancel'}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isBusy}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span>{translations.save || 'Save'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarCropModal;
