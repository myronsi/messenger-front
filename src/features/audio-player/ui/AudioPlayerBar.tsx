import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { ChevronDown, Mic, Music, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import {
  audioPosition, formatAudioTime, nextPlaybackSpeed, playNextAudio, playPreviousAudio, stopAudio, toggleAudio, useAudioPlayer, usePlaybackSpeed,
} from '@/entities/message';
import { AudioQueuePanel } from './AudioQueuePanel';

const SWIPE_DISTANCE = 56;

export const AudioPlayerBar = ({ className = '' }: { className?: string }) => {
  const { translations } = useLanguage();
  const t = translations.audioPlayer;
  const track = useAudioPlayer((player) => player.track);
  const playing = useAudioPlayer((player) => player.playing || player.loading);
  const ticking = useAudioPlayer((player) => player.playing);
  const time = useAudioPlayer((player) => player.time);
  const duration = useAudioPlayer((player) => player.duration);
  const hasNext = useAudioPlayer((player) => player.index + 1 < player.list.length);
  const speed = usePlaybackSpeed();
  const [smoothTime, setSmoothTime] = useState<number | null>(null);
  const [queueOpen, setQueueOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const swipe = useRef<{ x: number; moved: boolean } | null>(null);
  const root = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ticking) {
      setSmoothTime(null);
      return undefined;
    }
    let frame = requestAnimationFrame(function tick() {
      setSmoothTime(audioPosition());
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [ticking]);

  useEffect(() => {
    if (!queueOpen) return undefined;
    const close = (event: globalThis.PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setQueueOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [queueOpen]);

  if (!track) return null;
  const current = smoothTime ?? time;
  const progress = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;
  const KindIcon = track.kind === 'voice' ? Mic : Music;

  const swipeHandlers = {
    onPointerDown: (event: PointerEvent<HTMLElement>) => { swipe.current = { x: event.clientX, moved: false }; },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      if (!swipe.current) return;
      const dx = event.clientX - swipe.current.x;
      if (Math.abs(dx) > 8) swipe.current.moved = true;
      if (swipe.current.moved) setShift(Math.max(-SWIPE_DISTANCE, Math.min(SWIPE_DISTANCE, dx)));
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const start = swipe.current;
      setShift(0);
      if (!start) return;
      const dx = event.clientX - start.x;
      if (dx <= -SWIPE_DISTANCE) playNextAudio();
      else if (dx >= SWIPE_DISTANCE) playPreviousAudio();
    },
    onPointerCancel: () => { swipe.current = null; setShift(0); },
  };

  const iconButton = 'motion-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent';

  return (
    <div ref={root} data-testid="audio-player-bar" className={`relative z-30 shrink-0 ${className}`}>
      <div className="motion-panel-in relative flex h-11 items-center gap-1.5 overflow-hidden border-b border-border bg-background px-2 sm:px-4">
        <button type="button" onClick={playPreviousAudio} aria-label={t.previous} className={`${iconButton} hidden sm:flex`}>
          <SkipBack className="h-4 w-4 fill-current" />
        </button>
        <button type="button" onClick={toggleAudio} aria-label={playing ? t.pause : t.play}
          className="motion-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
        </button>
        <button type="button" onClick={playNextAudio} disabled={!hasNext} aria-label={t.next} className={`${iconButton} hidden disabled:opacity-40 sm:flex`}>
          <SkipForward className="h-4 w-4 fill-current" />
        </button>
        <button type="button" data-testid="audio-player-title" aria-expanded={queueOpen} aria-label={t.queue} {...swipeHandlers}
          onClick={() => { if (!swipe.current?.moved) setQueueOpen((open) => !open); swipe.current = null; }}
          className="flex h-full min-w-0 flex-1 touch-pan-y items-center gap-2 text-left"
          style={{ transform: shift ? `translateX(${shift}px)` : undefined, transition: shift ? 'none' : 'transform 160ms ease-out' }}>
          <KindIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{track.title}</span>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {formatAudioTime(current)}{duration > 0 ? ` / ${formatAudioTime(duration)}` : ''}
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${queueOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        <button type="button" onClick={nextPlaybackSpeed} aria-label={t.speed}
          className="motion-press shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
          {speed}×
        </button>
        <button type="button" onClick={stopAudio} aria-label={t.close} className={iconButton}>
          <X className="h-4 w-4" />
        </button>
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-primary/15">
          <span className="block h-full bg-primary" style={{ width: `${progress}%` }} />
        </span>
      </div>
      {queueOpen && <AudioQueuePanel />}
    </div>
  );
};
