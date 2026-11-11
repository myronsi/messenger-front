import { useCallback, useEffect, useRef, useState, type CSSProperties, type MutableRefObject } from 'react';
import { Loader2, Play } from 'lucide-react';
import { useAuthenticatedMedia } from '@/shared/api/useAuthenticatedMedia';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { VideoPlayBadge } from '@/shared/ui/VideoPlayBadge';
import { VideoControls, type Playback } from './VideoControls';
import { applyVideoPrefs, saveVideoPrefs, seekBy, SKIP_SECONDS, togglePlayback } from './videoPlayback';

const EVENTS = ['play', 'pause', 'ended', 'timeupdate', 'durationchange', 'loadedmetadata', 'volumechange', 'ratechange'];
const DOUBLE_TAP_MS = 300;
const STREAK_MS = 800;
const IDLE: Playback = { playing: false, time: 0, duration: 0, volume: 1, muted: false, rate: 1 };

export type VideoTap = (clientX: number, clientY: number, touch: boolean) => void;
interface Ripple { x: number; y: number; id: number }
interface Skip { side: -1 | 1; seconds: number; id: number; visible: boolean; ripple: Ripple }

interface ViewerVideoProps {
  url: string;
  name: string;
  poster?: string;
  loaded: boolean;
  idle: boolean;
  className: string;
  style: CSSProperties;
  tapRef: MutableRefObject<VideoTap | null>;
  mediaRef: (node: HTMLVideoElement | null) => void;
  onLoad: () => void;
  onError: () => void;
  controlsVisible?: boolean;
  onSingleTap?: () => void;
}

export function ViewerVideo({
  url, name, poster, loaded, idle, className, style, tapRef, mediaRef, onLoad, onError, controlsVisible = true, onSingleTap,
}: ViewerVideoProps) {
  const singleTapRef = useRef(onSingleTap);
  singleTapRef.current = onSingleTap;
  const { translations: t } = useLanguage();
  const src = useAuthenticatedMedia(url, undefined, true, onError);
  const posterSrc = useAuthenticatedMedia(poster);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [playback, setPlayback] = useState(IDLE);
  const [flash, setFlash] = useState(false);
  const [skip, setSkip] = useState<Skip | null>(null);
  const timers = useRef<{ tap?: number; flash?: number; skip?: number }>({});
  const taps = useRef<{ at: number; streakUntil: number; side: -1 | 1 }>({ at: 0, streakUntil: 0, side: 1 });
  const attach = useCallback((node: HTMLVideoElement | null) => {
    if (node) applyVideoPrefs(node);
    setVideo(node);
    mediaRef(node);
  }, [mediaRef]);

  useEffect(() => {
    if (!video) return;
    const sync = (event?: Event) => {
      setPlayback({
        playing: !video.paused && !video.ended,
        time: video.currentTime,
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        volume: video.volume,
        muted: video.muted || video.volume === 0,
        rate: video.playbackRate,
      });
      if (event?.type === 'volumechange' || event?.type === 'ratechange') saveVideoPrefs(video);
    };
    EVENTS.forEach(type => video.addEventListener(type, sync));
    sync();
    return () => EVENTS.forEach(type => video.removeEventListener(type, sync));
  }, [video]);

  useEffect(() => {
    if (!video || !playback.playing) return;
    let frame = 0;
    const tick = () => {
      setPlayback(current => (current.time === video.currentTime ? current : { ...current, time: video.currentTime }));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [video, playback.playing]);

  useEffect(() => {
    const pending = timers.current;
    return () => Object.values(pending).forEach(id => window.clearTimeout(id));
  }, []);

  const press = useCallback(() => {
    if (!video) return;
    if (video.paused || video.ended) {
      setFlash(true);
      window.clearTimeout(timers.current.flash);
      timers.current.flash = window.setTimeout(() => setFlash(false), 500);
    }
    togglePlayback(video);
  }, [video]);

  const skipTo = useCallback((side: -1 | 1, now: number, ripple: Ripple) => {
    if (!video) return;
    seekBy(video, side * SKIP_SECONDS);
    taps.current = { at: 0, streakUntil: now + STREAK_MS, side };
    setSkip(current => ({
      side, ripple, visible: true, id: current?.side === side && current.visible ? current.id : now,
      seconds: current?.side === side && current.visible ? current.seconds + SKIP_SECONDS : SKIP_SECONDS,
    }));
    window.clearTimeout(timers.current.skip);
    timers.current.skip = window.setTimeout(() => setSkip(current => current && { ...current, visible: false }), STREAK_MS);
  }, [video]);

  useEffect(() => {
    tapRef.current = (clientX, clientY, touch) => {
      if (!video) return;
      if (!touch) { press(); return; }
      const rect = (video.parentElement ?? video).getBoundingClientRect();
      const side: -1 | 1 = clientX - rect.left < rect.width / 2 ? -1 : 1;
      const now = performance.now();
      const ripple = { x: clientX - rect.left - (side === 1 ? rect.width * 0.6 : 0), y: clientY - rect.top, id: now };
      if (now < taps.current.streakUntil && side === taps.current.side) { skipTo(side, now, ripple); return; }
      window.clearTimeout(timers.current.tap);
      if (now - taps.current.at < DOUBLE_TAP_MS) { skipTo(side, now, ripple); return; }
      taps.current = { ...taps.current, at: now, streakUntil: 0 };
      timers.current.tap = window.setTimeout(() => (singleTapRef.current ? singleTapRef.current() : press()), DOUBLE_TAP_MS);
    };
    return () => { tapRef.current = null; };
  }, [press, skipTo, tapRef, video]);

  const badgeShown = idle && loaded && (!playback.playing || flash);
  const skipSide = skip?.side === -1 ? 'left-0' : 'right-0';

  return (
    <>
      {src && (
        <video key={src} ref={attach} src={src} poster={posterSrc} aria-label={name} autoPlay playsInline data-active-slide
          className={className} style={style} onLoadedData={onLoad} onError={onError} />
      )}
      {!loaded && <Loader2 data-testid="viewer-video-loading" className="pointer-events-none absolute inset-0 z-[1] m-auto h-7 w-7 animate-spin text-white/80" />}
      {loaded && (
        <VideoPlayBadge size="lg" icon={playback.playing ? 'pause' : 'play'}
          className={`absolute inset-0 z-[1] m-auto transition-[opacity,transform] duration-300 ease-out ${badgeShown ? 'scale-100 opacity-100' : 'scale-125 opacity-0'}`} />
      )}
      {skip && (
        <div key={skip.id} data-testid="viewer-video-skip" aria-live="polite"
          onTransitionEnd={(event) => { if (event.target === event.currentTarget && !skip.visible) setSkip(null); }}
          className={`pointer-events-none absolute inset-y-0 z-[1] w-2/5 transition-opacity duration-300 ease-out ${skipSide} ${skip.visible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="motion-image-viewer-backdrop relative flex h-full flex-col items-center justify-center gap-2 text-sm font-semibold text-white">
            <span key={skip.ripple.id} className="motion-video-skip-ripple absolute size-[min(70vw,360px)] rounded-full bg-white/20"
              style={{ left: skip.ripple.x, top: skip.ripple.y }} />
            <span className={`relative flex drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] ${skip.side === -1 ? 'flex-row-reverse' : ''}`}>
              {[0, 1, 2].map((arrow) => (
                <Play key={arrow} className={`motion-video-skip-arrow -mx-0.5 size-4 ${skip.side === -1 ? 'rotate-180' : ''}`}
                  fill="currentColor" strokeWidth={0} style={{ animationDelay: `${arrow * 120}ms` }} />
              ))}
            </span>
            <span key={skip.seconds} className="motion-reply-in relative tabular-nums drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">{t.videoSeconds.replace('{count}', String(skip.seconds))}</span>
          </div>
        </div>
      )}
      <VideoControls video={video} playback={playback} visible={idle && controlsVisible} />
    </>
  );
}
