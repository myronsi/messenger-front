import { useEffect, useState } from 'react';
import { Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { cn } from '@/shared/lib/utils';
import { useDelayedUnmount } from '@/shared/lib/useDelayedUnmount';
import { EmojiText } from '@/shared/ui/CustomEmoji';
import {
  formatAudioTime, nextPlaybackSpeed, playNextAudio, playPreviousAudio, seekAudio, stopAudio, toggleAudio, trackSubtitle, useAudioPlayer,
  usePlaybackSpeed,
} from '@/entities/message';
import { openNowPlaying } from '../model/nowPlaying';
import { useAudioTime } from '../model/useAudioTime';
import { useTrackSwipe } from '../model/useTrackSwipe';
import { MarqueeText } from './MarqueeText';
import { SeekBar } from './SeekBar';
import { TrackCover } from './TrackCover';

export const MINI_BAR_MOTION_MS = 320;

export const AudioPlayerBar = ({ className = '' }: { className?: string }) => {
  const { translations } = useLanguage();
  const t = translations.audioPlayer;
  const liveTrack = useAudioPlayer((player) => player.track);
  const [lastTrack, setLastTrack] = useState(liveTrack);
  if (liveTrack && liveTrack !== lastTrack) setLastTrack(liveTrack);
  const { mounted, closing } = useDelayedUnmount(!!liveTrack, MINI_BAR_MOTION_MS);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!liveTrack) {
      setSettled(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setSettled(true), MINI_BAR_MOTION_MS);
    return () => window.clearTimeout(timer);
  }, [liveTrack]);
  const playing = useAudioPlayer((player) => player.playing || player.loading);
  const duration = useAudioPlayer((player) => player.duration);
  const hasNext = useAudioPlayer((player) => player.index + 1 < player.list.length || (player.repeat === 'all' && player.list.length > 1));
  const speed = usePlaybackSpeed();
  const current = useAudioTime();
  const canPrevious = useAudioPlayer((player) => player.index > 0);
  const swipe = useTrackSwipe({ canNext: hasNext, canPrevious, onNext: playNextAudio, onPrevious: playPreviousAudio });

  const track = liveTrack ?? lastTrack;
  if (!mounted || !track) return null;
  const subtitle = trackSubtitle(track, t.fromName);

  const iconButton = 'motion-press flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent disabled:opacity-40';

  return (
    <div data-testid="audio-player-bar" data-closing={closing || undefined} aria-hidden={closing || undefined}
      className={cn('mini-player relative z-30 shrink-0', closing && 'is-closing pointer-events-none', className)}>
      <div className={cn('mini-player-inner min-h-0', !settled && 'overflow-hidden')}>
        <div className="relative flex h-14 items-center gap-2 border-b border-border bg-background/95 px-2 backdrop-blur sm:px-3">
          <button type="button" data-testid="audio-player-title" aria-label={t.nowPlayingTitle} {...swipe.handlers} style={swipe.style}
            onClick={() => { if (!swipe.consumeSwipe()) openNowPlaying(); }}
            className="flex h-full min-w-0 flex-1 items-center gap-2.5 text-left">
            <TrackCover track={track} data-mini-cover="" className="h-9 w-9 rounded-lg" />
            <span className="min-w-0 flex-1">
              <MarqueeText text={track.title} className="text-sm font-medium leading-tight" />
              <span className="block truncate text-xs leading-tight text-muted-foreground">
                {subtitle ? <EmojiText text={subtitle} /> : `${formatAudioTime(current)}${duration > 0 ? ` / ${formatAudioTime(duration)}` : ''}`}
              </span>
            </span>
          </button>
          <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground md:block">
            {formatAudioTime(current)}{duration > 0 ? ` / ${formatAudioTime(duration)}` : ''}
          </span>
          <button type="button" onClick={playPreviousAudio} aria-label={t.previous} className={`${iconButton} max-sm:hidden`}>
            <SkipBack className="h-4 w-4 fill-current" />
          </button>
          <button type="button" onClick={toggleAudio} aria-label={playing ? t.pause : t.play}
            className="motion-press flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
          </button>
          <button type="button" onClick={playNextAudio} disabled={!hasNext} aria-label={t.next} className={`${iconButton} max-sm:hidden`}>
            <SkipForward className="h-4 w-4 fill-current" />
          </button>
          <button type="button" onClick={nextPlaybackSpeed} aria-label={t.speed}
            className="motion-press hidden shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary sm:block">
            {speed}×
          </button>
          <button type="button" onClick={stopAudio} aria-label={t.close} className={`${iconButton} text-muted-foreground`}>
            <X className="h-4 w-4" />
          </button>
          <SeekBar variant="thin" time={current} duration={duration} label={t.seek} onSeek={seekAudio} className="absolute inset-x-0 -bottom-1.5" />
        </div>
      </div>
    </div>
  );
};
