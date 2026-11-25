import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { createPinchTracker } from '@/shared/lib/pinchTracker';
import { Button } from '@/shared/ui/button';
import { Slider } from '@/shared/ui/slider';
import { Switch } from '@/shared/ui/switch';
import { clampZoom, coverZoom, displayedSize, initialCrop, MAX_ZOOM_OVER_COVER, type CropState, type ImageSize } from '../model/crop';
import { adjustTrim, clipKind, cropFractions, gifDurationMs, initialTrim, type StickerClip } from '../model/clip';

interface VideoStickerEditorProps {
  src: string;
  type: string;
  initial?: StickerClip | null;
  onCancel: () => void;
  onDone: (clip: StickerClip) => void;
  onError: (message: string) => void;
}

const checkerboard = 'repeating-conic-gradient(hsl(var(--muted)) 0% 25%, transparent 0% 50%) 50% / 20px 20px';
const seconds = (ms: number) => (ms / 1000).toFixed(1);

export const VideoStickerEditor = ({ src, type, initial, onCancel, onDone, onError }: VideoStickerEditorProps) => {
  const { translations } = useLanguage();
  const t = translations.videoStickers;
  const isGif = type === 'image/gif';
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const pinch = useRef(createPinchTracker()).current;
  const [size, setSize] = useState<ImageSize | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [trim, setTrim] = useState<[number, number]>(initial ? [initial.startMs, initial.endMs] : [0, 0]);
  const [cropOn, setCropOn] = useState(!!initial?.crop);
  const [crop, setCrop] = useState<CropState>({ zoom: 1, x: 0, y: 0 });
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const node = frameRef.current;
    if (!node) return undefined;
    const measure = () => setFrame(node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isGif) return undefined;
    let cancelled = false;
    void fetch(src).then((response) => response.arrayBuffer()).then((buffer) => {
      if (cancelled) return;
      const ms = gifDurationMs(buffer) ?? 0;
      setDuration(ms);
      if (!initial) setTrim(initialTrim(ms));
    }).catch(() => { if (!cancelled) onError(t.unreadable); });
    return () => { cancelled = true; };
  }, [initial, isGif, onError, src, t.unreadable]);

  const measured = (next: ImageSize) => {
    setSize(next);
    setCrop(initialCrop(next));
  };
  const onVideoReady = () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    measured({ width: video.videoWidth, height: video.videoHeight });
    const ms = Math.round(video.duration * 1000);
    setDuration(Number.isFinite(ms) ? ms : 0);
    if (!initial && Number.isFinite(ms)) setTrim(initialTrim(ms));
  };
  const loop = () => {
    const video = videoRef.current;
    if (!video || trim[1] <= trim[0]) return;
    if (video.currentTime * 1000 >= trim[1] || video.currentTime * 1000 < trim[0] - 50) video.currentTime = trim[0] / 1000;
  };
  useEffect(() => { if (videoRef.current) videoRef.current.currentTime = trim[0] / 1000; }, [trim]);

  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!cropOn || !size) return;
    const factor = pinch.move(event.pointerId, event.clientX, event.clientY);
    if (factor !== null) { setCrop((value) => ({ ...value, zoom: Math.max(coverZoom(size), clampZoom(value.zoom * factor, size)) })); return; }
    const last = drag.current;
    if (pinch.pinching || !last || last.id !== event.pointerId || !frame) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    setCrop((value) => ({ ...value, x: value.x + (event.clientX - last.x) / frame, y: value.y + (event.clientY - last.y) / frame }));
  };

  const finish = () => {
    if (duration === null) return;
    onDone({ kind: clipKind(type), startMs: trim[0], endMs: trim[1] || duration, crop: cropOn && size ? cropFractions(size, crop) : null });
  };

  const zoom = cropOn && size ? Math.max(crop.zoom, coverZoom(size)) : 1;
  const drawn = size && frame ? displayedSize(size, zoom, frame) : null;
  const placed = drawn ? {
    width: drawn.width, height: drawn.height,
    transform: `translate(calc(-50% + ${cropOn ? crop.x * frame : 0}px), calc(-50% + ${cropOn ? crop.y * frame : 0}px))`,
  } : { opacity: 0 };
  const media = 'pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none';
  return (
    <div className="flex flex-col gap-3" data-testid="video-sticker-editor">
      <div ref={frameRef} data-testid="sticker-crop-frame" style={{ background: checkerboard }}
        className="relative mx-auto aspect-square w-full max-w-72 touch-none overflow-hidden rounded-2xl border border-border"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          pinch.down(event.pointerId, event.clientX, event.clientY);
          drag.current = pinch.pinching ? null : { id: event.pointerId, x: event.clientX, y: event.clientY };
        }}
        onPointerMove={move}
        onPointerUp={(event) => { pinch.up(event.pointerId); drag.current = null; }}
        onPointerCancel={(event) => { pinch.up(event.pointerId); drag.current = null; }}>
        {isGif ? (
          <img src={src} alt="" draggable={false} className={media} style={placed}
            onLoad={(event) => measured({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
            onError={() => onError(t.unreadable)} />
        ) : (
          <video ref={videoRef} src={src} className={media} style={placed} muted autoPlay playsInline loop
            onLoadedMetadata={onVideoReady} onTimeUpdate={loop} onError={() => onError(t.unreadable)} />
        )}
      </div>
      <label className="flex items-center gap-3 text-sm">
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{t.squareCrop}</span>
          {!cropOn && <span className="block text-xs text-muted-foreground">{t.squareCropHint}</span>}
        </span>
        <Switch checked={cropOn} disabled={!size} onCheckedChange={setCropOn} aria-label={t.squareCrop} />
      </label>
      {cropOn && size && (
        <label className="flex items-center gap-3 text-sm">
          <span className="shrink-0 text-muted-foreground">{translations.stickerZoom}</span>
          <input type="range" className="w-full accent-primary" min={coverZoom(size)} max={coverZoom(size) * MAX_ZOOM_OVER_COVER} step={0.01}
            value={zoom} onChange={(event) => setCrop((value) => ({ ...value, zoom: Number(event.target.value) }))} />
        </label>
      )}
      <div className="flex flex-col gap-2 text-sm">
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-medium">{t.trim}</span>
          <span className="tabular-nums text-muted-foreground">{fillTemplate(t.range, { start: seconds(trim[0]), end: seconds(trim[1]) })}</span>
        </span>
        <Slider min={0} max={Math.max(duration ?? 0, 1)} step={50} value={trim} disabled={!duration} aria-label={t.trim}
          onValueChange={(value) => setTrim((previous) => adjustTrim(previous, [value[0], value[1]], duration ?? 0))} />
        <span className="text-xs text-muted-foreground">{t.trimHint}</span>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>{translations.cancel}</Button>
        <Button disabled={duration === null || !size} onClick={finish}>{translations.next}</Button>
      </div>
    </div>
  );
};
