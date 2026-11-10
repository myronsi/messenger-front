import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Button } from '@/shared/ui/button';
import { clampZoom, coverZoom, displayedSize, initialCrop, MAX_ZOOM_OVER_COVER, renderCrop, type CropState, type ImageSize } from '../model/crop';

interface StickerCropperProps {
  src: string;
  onCancel: () => void;
  onDone: (image: Blob) => void;
  onError: (message: string) => void;
}

const checkerboard = 'repeating-conic-gradient(hsl(var(--muted)) 0% 25%, transparent 0% 50%) 50% / 20px 20px';

export const StickerCropper = ({ src, onCancel, onDone, onError }: StickerCropperProps) => {
  const { translations } = useLanguage();
  const imageRef = useRef<HTMLImageElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const [size, setSize] = useState<ImageSize | null>(null);
  const [crop, setCrop] = useState<CropState>({ zoom: 1, x: 0, y: 0 });
  const [frame, setFrame] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const node = frameRef.current;
    if (!node) return;
    const measure = () => setFrame(node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const onLoad = () => {
    const image = imageRef.current;
    if (!image?.naturalWidth || !image.naturalHeight) return;
    const next = { width: image.naturalWidth, height: image.naturalHeight };
    setSize(next);
    setCrop(initialCrop(next));
  };

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const last = drag.current;
    if (!last || last.id !== event.pointerId || !frame) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    setCrop((value) => ({ ...value, x: value.x + (event.clientX - last.x) / frame, y: value.y + (event.clientY - last.y) / frame }));
  };

  const finish = async () => {
    const image = imageRef.current;
    if (!image || !size) return;
    setBusy(true);
    try {
      onDone(await renderCrop(image, size, crop));
    } catch {
      onError(translations.stickerImageUnreadable);
    } finally {
      setBusy(false);
    }
  };

  const drawn = size && frame ? displayedSize(size, crop.zoom, frame) : null;
  return (
    <div className="flex flex-col gap-3">
      <div
        ref={frameRef}
        data-testid="sticker-crop-frame"
        className="relative mx-auto aspect-square w-full max-w-72 touch-none overflow-hidden rounded-2xl border border-border"
        style={{ background: checkerboard }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        }}
        onPointerMove={move}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
        onWheel={(event) => size && setCrop((value) => ({ ...value, zoom: clampZoom(value.zoom * (event.deltaY < 0 ? 1.08 : 0.92), size) }))}
      >
        <img
          ref={imageRef}
          src={src}
          alt=""
          draggable={false}
          onLoad={onLoad}
          onError={() => onError(translations.stickerImageUnreadable)}
          className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
          style={drawn ? {
            width: drawn.width, height: drawn.height,
            transform: `translate(calc(-50% + ${crop.x * frame}px), calc(-50% + ${crop.y * frame}px))`,
          } : { opacity: 0 }}
        />
      </div>
      <p className="text-center text-xs text-muted-foreground">{translations.stickerCropHint}</p>
      <label className="flex items-center gap-3 text-sm">
        <span className="shrink-0 text-muted-foreground">{translations.stickerZoom}</span>
        <input
          type="range"
          className="w-full accent-primary"
          min={1}
          max={size ? coverZoom(size) * MAX_ZOOM_OVER_COVER : 3}
          step={0.01}
          value={crop.zoom}
          disabled={!size}
          onChange={(event) => size && setCrop((value) => ({ ...value, zoom: clampZoom(Number(event.target.value), size) }))}
        />
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>{translations.cancel}</Button>
        <Button disabled={!size || busy} onClick={() => { void finish(); }}>{translations.next}</Button>
      </div>
    </div>
  );
};
