import { useRef, useState, type SyntheticEvent } from 'react';
import { Download, Pause, Play, Volume2, VolumeX, ZoomIn, ZoomOut, X } from 'lucide-react';
import { fetchMedia } from '@/shared/api/fetchMedia';
import { useAuthenticatedMedia } from '@/shared/api/useAuthenticatedMedia';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/shared/ui/dialog';
import VideoThumbnail, { type VideoPreview } from './VideoThumbnail';
import { formatAudioTime } from '../model/audioMessageHelpers';

const stopPropagation = (event: SyntheticEvent) => event.stopPropagation();
const controlClass = 'inline-flex h-9 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 disabled:opacity-40';
const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

function VideoPlayer({ url, name, poster, onClose }: VideoPreview & { onClose?: () => void }) {
  const { translations: t } = useLanguage();
  const player = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [downloadFailed, setDownloadFailed] = useState(false);
  const src = useAuthenticatedMedia(url, undefined, true, () => setFailed(true));
  const posterSrc = useAuthenticatedMedia(poster);

  const togglePlayback = () => {
    if (player.current?.paused) {
      void player.current.play().catch(() => {});
    } else {
      player.current?.pause();
    }
  };

  const download = async () => {
    setDownloading(true);
    setDownloadFailed(false);
    let temporaryUrl: string | undefined;
    try {
      let href = src;
      if (!href?.startsWith('blob:')) {
        const response = await fetchMedia(url);
        if (!response.ok) throw new Error('Download failed');
        temporaryUrl = URL.createObjectURL(await response.blob());
        href = temporaryUrl;
      }
      const link = document.createElement('a');
      link.href = href;
      link.download = name;
      document.body.append(link);
      link.click();
      link.remove();
    } catch {
      setDownloadFailed(true);
    } finally {
      if (temporaryUrl) {
        const href = temporaryUrl;
        setTimeout(() => URL.revokeObjectURL(href), 1000);
      }
      setDownloading(false);
    }
  };

  return (
    <div className="w-full overflow-hidden rounded-2xl bg-black text-white shadow-sm ring-1 ring-white/10"
      onClick={stopPropagation} onTouchStart={stopPropagation} onTouchMove={stopPropagation}
      onTouchEnd={stopPropagation} onTouchCancel={stopPropagation}>
      <div className="relative grid aspect-video max-h-[65dvh] place-items-center overflow-hidden">
        {posterSrc && !src && <img src={posterSrc} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />}
        {src && !failed && (
          <video ref={player} src={src} poster={posterSrc} aria-label={name} autoPlay playsInline muted={muted}
            className="absolute inset-0 h-full w-full object-contain" style={{ transform: `scale(${zoom})` }}
            onClick={togglePlayback}
            onLoadedMetadata={event => {
              const video = event.currentTarget;
              video.playbackRate = speed;
              video.volume = volume;
            }}
            onDurationChange={event => {
              const next = event.currentTarget.duration;
              setDuration(Number.isFinite(next) ? next : 0);
            }}
            onTimeUpdate={event => setTime(event.currentTarget.currentTime)}
            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
            onError={() => setFailed(true)}
          />
        )}
        {failed && <span role="status" className="relative px-4 text-center text-sm">{t.videoPlaybackFailed}</span>}
        {!failed && !src && <span role="status" className="relative rounded-full bg-black/65 px-4 py-2 text-sm backdrop-blur">{t.videoLoading}</span>}
        {onClose && <button type="button" aria-label={t.close} onClick={onClose}
          className={controlClass + ' absolute right-2 top-2 bg-black/60 backdrop-blur-md'}><X size={18} /></button>}
      </div>
      <div className="border-t border-white/10 bg-white/5 px-2 pb-1 pt-2 sm:px-3">
        {!failed && (
          <div className="flex items-center gap-2 px-1">
            <input type="range" min={0} max={duration || 1} step="any" value={Math.min(time, duration)}
              aria-label={t.seekVideo} disabled={!duration} className="h-3 min-w-0 flex-1 cursor-pointer accent-white"
              onChange={event => {
                const next = event.currentTarget.valueAsNumber;
                if (player.current) player.current.currentTime = next;
                setTime(next);
              }} />
            <span className="shrink-0 text-[11px] tabular-nums text-white/75">{formatAudioTime(time)} / {formatAudioTime(duration)}</span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-0.5">
          {!failed && (
            <>
              <button type="button" className={controlClass} onClick={togglePlayback} disabled={!src}
                aria-label={playing ? t.pauseVideo : t.playVideo} title={playing ? t.pauseVideo : t.playVideo}>
                {playing ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <button type="button" className={controlClass} onClick={() => setMuted(!muted)}
                aria-label={muted ? t.unmuteVideo : t.mute} title={muted ? t.unmuteVideo : t.mute}>
                {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume}
                aria-label={t.videoVolume} title={t.videoVolume} className="h-3 w-9 cursor-pointer accent-white sm:w-12"
                onChange={event => {
                  const next = event.currentTarget.valueAsNumber;
                  if (player.current) player.current.volume = next;
                  setVolume(next);
                  setMuted(false);
                }} />
              <select aria-label={t.videoSpeed} title={t.videoSpeed} value={speed}
                className="h-8 cursor-pointer rounded-full bg-black px-1 text-xs text-white hover:bg-white/10"
                onChange={event => {
                  const next = Number(event.currentTarget.value);
                  if (player.current) player.current.playbackRate = next;
                  setSpeed(next);
                }}>
                {speeds.map(rate => <option key={rate} value={rate}>{rate}×</option>)}
              </select>
              <button type="button" className={controlClass} onClick={() => setZoom(zoom - 0.25)}
                aria-label={t.zoomOut} title={t.zoomOut} disabled={zoom <= 1}>
                <ZoomOut size={18} />
              </button>
              <button type="button" className={controlClass} onClick={() => setZoom(zoom + 0.25)}
                aria-label={t.zoomIn} title={t.zoomIn} disabled={zoom >= 3}>
                <ZoomIn size={18} />
              </button>
            </>
          )}
          <span className="flex-1" />
          <button type="button" className={controlClass} onClick={download} disabled={downloading}
            aria-label={`${t.download} ${name}`} title={t.download}>
            <Download size={18} />
          </button>
        </div>
        {downloadFailed && <p role="status" className="px-1 text-xs">{t.errorLoading}</p>}
      </div>
    </div>
  );
}

export default function VideoMessage({ preview, aspectRatio }: { preview: VideoPreview; aspectRatio?: number }) {
  const [opened, setOpened] = useState(false);
  return (
    <div className="w-[24rem] max-w-full">
      {opened
        ? <VideoPlayer {...preview} onClose={() => setOpened(false)} />
        : <div style={{ aspectRatio: aspectRatio ?? 16 / 9 }} className="max-h-72 overflow-hidden rounded-2xl">
            <VideoThumbnail {...preview} className="h-full w-full" onOpen={() => setOpened(true)} />
          </div>}
    </div>
  );
}

export function VideoViewer({ preview, onClose, onShowInChat }: {
  preview: VideoPreview;
  onClose: () => void;
  onShowInChat?: () => void;
}) {
  const { translations: t } = useLanguage();
  const opener = useRef(document.activeElement);
  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent hideClose aria-describedby={undefined}
        onClick={stopPropagation} onCloseAutoFocus={event => {
          event.preventDefault();
          if (opener.current instanceof HTMLElement) opener.current.focus();
        }}
        className="w-[calc(100%-1.5rem)] max-w-4xl gap-0 overflow-hidden rounded-2xl p-0">
        <div className="flex min-w-0 items-center gap-2 px-3 py-1.5">
          <DialogTitle className="min-w-0 flex-1 truncate text-sm">{preview.name}</DialogTitle>
          {onShowInChat && <button type="button" className="shrink-0 rounded-full px-3 py-2 text-xs hover:bg-accent"
            onClick={() => { onClose(); onShowInChat(); }}>{t.showInChat}</button>}
          <DialogClose className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-accent" aria-label={t.close}><X size={18} /></DialogClose>
        </div>
        <VideoPlayer {...preview} />
      </DialogContent>
    </Dialog>
  );
}
