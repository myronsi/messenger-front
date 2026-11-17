import { ModalSurface } from '@/shared/ui/ModalSurface';
import { createPinchTracker } from '@/shared/lib/pinchTracker';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';

type CropShape = 'circle' | 'banner';

interface AvatarCropModalProps {
  file: File;
  imageUrl: string;
  isUploading?: boolean;
  shape?: CropShape;
  title?: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

interface Box {
  width: number;
  height: number;
}

const SHAPES: Record<CropShape, { view: Box; output: Box }> = {
  circle: { view: { width: 280, height: 280 }, output: { width: 512, height: 512 } },
  banner: { view: { width: 300, height: 100 }, output: { width: 1500, height: 500 } },
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

const MAX_ZOOM = 3;

const getDisplaySize = (width: number, height: number, zoom: number, view: Box) => {
  const baseScale = Math.max(view.width / width, view.height / height);
  return {
    width: width * baseScale * zoom,
    height: height * baseScale * zoom,
  };
};

const clampOffset = (offset: { x: number; y: number }, size: Box | null, zoom: number, view: Box) => {
  if (!size) return offset;
  const displaySize = getDisplaySize(size.width, size.height, zoom, view);
  const maxX = Math.max(0, (displaySize.width - view.width) / 2);
  const maxY = Math.max(0, (displaySize.height - view.height) / 2);

  return {
    x: Math.min(maxX, Math.max(-maxX, offset.x)),
    y: Math.min(maxY, Math.max(-maxY, offset.y)),
  };
};

const createCroppedImage = async (imageUrl: string, sourceFile: File, zoom: number, offset: { x: number; y: number }, shape: CropShape) => {
  const { view, output } = SHAPES[shape];
  const image = await loadImage(imageUrl);
  const canvas = document.createElement('canvas');
  canvas.width = output.width;
  canvas.height = output.height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, output.width, output.height);

  const { width: displayWidth, height: displayHeight } = getDisplaySize(image.naturalWidth, image.naturalHeight, zoom, view);
  const displayX = (view.width - displayWidth) / 2 + offset.x;
  const displayY = (view.height - displayHeight) / 2 + offset.y;
  const scaleToCanvas = output.width / view.width;

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

  const filename = sourceFile.name.replace(/\.[^.]+$/, '') || shape;
  return new File([blob], `${filename}-cropped.jpg`, { type: 'image/jpeg' });
};

const AvatarCropModal: React.FC<AvatarCropModalProps> = ({ file, imageUrl, isUploading, shape = 'circle', title, onCancel, onConfirm }) => {
  const { translations } = useLanguage();
  const { view } = SHAPES[shape];
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isCropping, setIsCropping] = useState(false);
  const [sourceSize, setSourceSize] = useState<{ width: number; height: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const pinch = useRef(createPinchTracker()).current;

  const imageStyle = useMemo(() => {
    if (!sourceSize) {
      return { height: '100%', width: '100%', left: 0, top: 0 };
    }

    const displaySize = getDisplaySize(sourceSize.width, sourceSize.height, zoom, view);
    return {
      height: `${displaySize.height}px`,
      width: `${displaySize.width}px`,
      left: `${(view.width - displaySize.width) / 2 + offset.x}px`,
      top: `${(view.height - displaySize.height) / 2 + offset.y}px`,
    };
  }, [offset.x, offset.y, sourceSize, zoom, view]);

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    loadImage(imageUrl)
      .then((image) => setSourceSize({ width: image.naturalWidth, height: image.naturalHeight }))
      .catch(() => setSourceSize(null));
  }, [file, imageUrl]);

  useEffect(() => {
    setOffset((currentOffset) => clampOffset(currentOffset, sourceSize, zoom, view));
  }, [sourceSize, zoom, view]);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const factor = pinch.move(event.pointerId, event.clientX, event.clientY);
    if (factor !== null) {
      setZoom((value) => Math.min(MAX_ZOOM, Math.max(1, value * factor)));
      return;
    }
    if (pinch.pinching) return;
    const start = dragStartRef.current;
    if (!start) return;
    setOffset(clampOffset({
      x: start.offsetX + event.clientX - start.x,
      y: start.offsetY + event.clientY - start.y,
    }, sourceSize, zoom, view));
  };

  const handleConfirm = async () => {
    setIsCropping(true);
    try {
      const croppedFile = await createCroppedImage(imageUrl, file, zoom, offset, shape);
      onConfirm(croppedFile);
    } finally {
      setIsCropping(false);
    }
  };

  const isBusy = isUploading || isCropping;

  return (
    <ModalSurface label={title ?? 'Crop profile photo'}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget && !isBusy) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-lg bg-background p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-foreground">
            {title ?? (translations.cropProfilePicture || 'Crop profile picture')}
          </h3>
          <button
            onClick={onCancel}
            disabled={isBusy}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
            aria-label="Close crop dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div
            data-testid="crop-view"
            style={{ width: view.width, height: view.height }}
            className="relative touch-none overflow-hidden rounded-lg bg-black"
            onPointerDown={(event) => {
              if (isBusy) return;
              pinch.down(event.pointerId, event.clientX, event.clientY);
              event.currentTarget.setPointerCapture(event.pointerId);
              if (pinch.pinching) {
                dragStartRef.current = null;
                return;
              }
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
              pinch.up(event.pointerId);
              dragStartRef.current = null;
              event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerCancel={(event) => {
              pinch.up(event.pointerId);
              dragStartRef.current = null;
            }}
          >
            <AuthenticatedImage
              src={imageUrl}
              alt="Avatar crop preview"
              className="absolute max-w-none select-none object-cover"
              draggable={false}
              style={imageStyle}
            />
            {shape === 'circle' ? <>
              <div className="pointer-events-none absolute inset-0 bg-black/35" />
              <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-white shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" />
            </> : <div className="pointer-events-none absolute inset-0 rounded-lg border-2 border-white/80" />}
          </div>

          <label className="w-full text-sm font-medium text-subtle-foreground">
            {translations.zoom || 'Zoom'}
            <input
              type="range"
              min="1"
              max={MAX_ZOOM}
              step="0.01"
              value={zoom}
              disabled={isBusy}
              onChange={(event) => {
                const nextZoom = Number(event.target.value);
                setZoom(nextZoom);
                setOffset((currentOffset) => clampOffset(currentOffset, sourceSize, nextZoom, view));
              }}
              className="mt-2 w-full accent-primary"
            />
          </label>

          <div className="flex w-full gap-3">
            <button
              onClick={onCancel}
              disabled={isBusy}
              className="flex-1 rounded-md border border-input px-4 py-2 text-subtle-foreground transition-colors hover:bg-accent/60 disabled:opacity-50"
            >
              {translations.cancel || 'Cancel'}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isBusy}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary-darker disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span>{translations.save || 'Save'}</span>
            </button>
          </div>
        </div>
      </div>
    </ModalSurface>
  );
};

export default AvatarCropModal;
