import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { ChevronDown, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { EmojiText } from '@/shared/ui/CustomEmoji';
import {
  cycleRepeat, formatAudioTime, nextPlaybackSpeed, playNextAudio, playPreviousAudio, seekAudio, toggleAudio, toggleShuffle, TrackMenu, trackSubtitle,
  useAudioPlayer, usePlaybackSpeed,
} from '@/entities/message';
import { cn } from '@/shared/lib/utils';
import { useDelayedUnmount } from '@/shared/lib/useDelayedUnmount';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { ModalSurface } from '@/shared/ui/ModalSurface';
import { findMiniCover, flyCover, prefersReducedMotion } from '../model/coverFlight';
import { closeNowPlaying, useNowPlayingOpen } from '../model/nowPlaying';
import { useAudioTime } from '../model/useAudioTime';
import { SETTLE_MS, useDragToDismiss } from '../model/useDragToDismiss';
import { useScrollProgress } from '../model/useScrollProgress';
import { MarqueeText } from './MarqueeText';
import { PlaylistsPanel } from './PlaylistsPanel';
import { QueueList } from './QueueList';
import { RecentList } from './RecentList';
import { SeekBar } from './SeekBar';
import { TrackCover } from './TrackCover';

type Tab = 'queue' | 'recent' | 'playlists';

const OPEN_FLIGHT_MS = 480;
const EXIT_MS = 300;
const COLLAPSE_DISTANCE = 260;
const COVER_RADIUS = '16px';
const MINI_RADIUS = '8px';
const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

const collapseStyle: CSSProperties = {
  transform: 'translateY(calc(var(--p, 0) * 48px)) scale(calc(1 - var(--p, 0) * 0.3))',
  opacity: 'calc(1 - var(--p, 0) * 0.85)',
  transformOrigin: 'top center',
};
const compactStyle: CSSProperties = {
  opacity: 'clamp(0, calc((var(--p, 0) - 0.55) * 3), 1)',
  transform: 'translateY(calc((1 - var(--p, 0)) * 8px))',
};

const Ambient = ({ cover, id }: { cover?: string; id: string }) => (
  <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[460px] overflow-hidden">
    <div key={id} data-testid="now-playing-ambient" className="motion-ambient absolute -inset-10 scale-125 opacity-50 blur-3xl">
      {cover ? <AuthenticatedImage src={cover} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-br from-primary to-primary/10" />}
    </div>
    <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/70 to-background" />
  </div>
);

const NowPlayingSheet = ({ closing }: { closing: boolean }) => {
  const { translations } = useLanguage();
  const t = translations.audioPlayer;
  const track = useAudioPlayer((player) => player.track);
  const playing = useAudioPlayer((player) => player.playing || player.loading);
  const duration = useAudioPlayer((player) => player.duration);
  const shuffle = useAudioPlayer((player) => player.shuffle);
  const repeat = useAudioPlayer((player) => player.repeat);
  const hasNext = useAudioPlayer((player) => player.index + 1 < player.list.length || (player.repeat === 'all' && player.list.length > 1));
  const upcoming = useAudioPlayer((player) => Math.max(0, player.list.length - player.index - 1));
  const speed = usePlaybackSpeed();
  const playerTime = useAudioTime();
  const [scrub, setScrub] = useState<number | null>(null);
  const current = scrub ?? playerTime;
  const [tab, setTab] = useState<Tab>('queue');
  const [fromCover] = useState(() => !prefersReducedMotion() && !!findMiniCover());
  const [firstTrack] = useState(() => (track ? String(track.id) : ''));
  const cover = useRef<HTMLSpanElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const scroll = useScrollProgress(COLLAPSE_DISTANCE);
  const drag = useDragToDismiss({ onDismiss: () => closeNowPlaying(), canStart: () => (scroller.current?.scrollTop ?? 0) <= 0, area: scroller });

  useLayoutEffect(() => {
    const mini = findMiniCover();
    const big = cover.current;
    if (!fromCover || !mini || !big) return;
    big.style.visibility = 'hidden';
    flyCover({
      source: mini, from: mini.getBoundingClientRect(), to: big.getBoundingClientRect(), fromRadius: MINI_RADIUS, toRadius: COVER_RADIUS,
      duration: OPEN_FLIGHT_MS, onDone: () => { big.style.visibility = ''; },
    });
  }, [fromCover]);

  useEffect(() => {
    if (!closing || drag.dismissed || !fromCover) return;
    const mini = findMiniCover();
    const big = cover.current;
    if (!mini || !big) return;
    const from = big.getBoundingClientRect();
    big.style.visibility = 'hidden';
    mini.style.visibility = 'hidden';
    flyCover({
      source: big, from, to: mini.getBoundingClientRect(), fromRadius: COVER_RADIUS, toRadius: MINI_RADIUS, duration: EXIT_MS,
      onDone: () => { mini.style.visibility = ''; },
    });
  }, [closing, drag.dismissed, fromCover]);

  if (!track) return null;
  const subtitle = trackSubtitle(track, t.fromName);
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;
  const repeatLabel = repeat === 'one' ? t.repeatOne : repeat === 'all' ? t.repeatAll : t.repeatOff;
  const toggleButton = (on: boolean) => cn('motion-press flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-accent',
    on ? 'text-primary' : 'text-muted-foreground');
  const tabs: { key: Tab; label: string }[] = [
    { key: 'queue', label: upcoming ? `${t.upNext} · ${upcoming}` : t.upNext }, { key: 'recent', label: t.recent }, { key: 'playlists', label: t.playlists },
  ];
  const fade = drag.offset ? Math.max(0, 1 - drag.offset / 500) : 1;
  const panelStyle: CSSProperties = {
    transform: drag.offset ? `translateY(${drag.offset}px)` : undefined,
    transition: drag.settling ? `transform ${SETTLE_MS}ms cubic-bezier(0.32, 0.72, 0, 1)` : undefined,
  };
  const trackId = String(track.id);

  return (
    <ModalSurface label={t.nowPlayingTitle} onDismiss={closeNowPlaying} ownExit
      className={cn('now-playing-backdrop fixed inset-0 z-[80] flex items-stretch justify-center sm:items-center sm:p-6', closing && 'is-closing')}
      style={{ backgroundColor: `rgb(0 0 0 / ${0.5 * fade})` }}
      >
      <div ref={scroll.target} data-testid="now-playing" data-closing={closing || undefined} style={panelStyle}
        className={cn('now-playing-panel relative flex h-full w-full flex-col overflow-hidden bg-background sm:h-[min(860px,100%)] sm:max-w-md sm:rounded-2xl',
          'sm:border sm:border-border sm:shadow-2xl', fromCover && 'from-cover', closing && !drag.dismissed && 'is-closing')}>
        <Ambient cover={track.cover} id={trackId} />
        <div {...drag.handlers} className="relative z-10 shrink-0 touch-none">
          <span aria-hidden="true" className="mx-auto mt-2 block h-1 w-10 rounded-full bg-foreground/20 sm:hidden" />
          <header className="relative flex h-14 items-center gap-2 px-2">
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-border" style={{ opacity: 'var(--p, 0)' }} />
            <button type="button" onClick={() => closeNowPlaying()} aria-label={t.minimize}
              className="motion-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-accent">
              <ChevronDown className="h-5 w-5" />
            </button>
            <div className="relative h-full min-w-0 flex-1">
              <h2 className="absolute inset-0 flex items-center justify-center truncate text-sm font-semibold" style={{ opacity: 'calc(1 - var(--p, 0) * 2)' }}>
                {t.nowPlayingTitle}
              </h2>
              <div data-testid="now-playing-compact" aria-hidden={!scroll.collapsed} style={compactStyle}
                className={cn('absolute inset-0 flex items-center gap-2', !scroll.collapsed && 'pointer-events-none')}>
                <TrackCover track={track} className="h-8 w-8 rounded-md" />
                <MarqueeText text={track.title} className="min-w-0 flex-1 text-sm font-semibold" />
                <button type="button" tabIndex={scroll.collapsed ? 0 : -1} onClick={toggleAudio} aria-label={playing ? t.pause : t.play}
                  className="motion-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  {playing ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />}
                </button>
              </div>
            </div>
            <TrackMenu track={track} className="h-10 w-10" />
          </header>
        </div>
        <div ref={scroller} onScroll={scroll.onScroll} className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
          <div className="px-6">
            <div style={collapseStyle}>
              <div className="mx-auto w-full max-w-[260px] transition-transform duration-500" style={{ transform: playing ? 'scale(1)' : 'scale(0.86)', transitionTimingFunction: SPRING }}>
                <div key={trackId} className={cn(trackId !== firstTrack && 'motion-cover-swap')}>
                  <TrackCover ref={cover} data-testid="now-playing-cover" track={track} className="aspect-square w-full rounded-2xl shadow-2xl" iconClassName="h-16 w-16" />
                </div>
              </div>
            </div>
            <div data-testid="now-playing-title" className="mt-5 min-w-0">
              <MarqueeText key={trackId} text={track.title} className="text-xl font-semibold" />
              {subtitle && <p className="truncate text-sm text-muted-foreground"><EmojiText text={subtitle} /></p>}
            </div>
            <SeekBar time={playerTime} duration={duration} label={t.seek} onSeek={seekAudio} onScrub={setScrub} className="mt-4" />
            <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
              <span>{formatAudioTime(current)}</span>
              <span>{duration > 0 ? formatAudioTime(duration) : '--:--'}</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <button type="button" onClick={toggleShuffle} aria-label={t.shuffle} aria-pressed={shuffle} className={toggleButton(shuffle)}>
                <Shuffle className="h-5 w-5" />
              </button>
              <button type="button" onClick={playPreviousAudio} aria-label={t.previous} className="motion-press flex h-12 w-12 items-center justify-center rounded-full hover:bg-accent">
                <SkipBack className="h-6 w-6 fill-current" />
              </button>
              <button type="button" onClick={toggleAudio} aria-label={playing ? t.pause : t.play}
                className="motion-press flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                {playing ? <Pause className="h-7 w-7 fill-current" /> : <Play className="ml-1 h-7 w-7 fill-current" />}
              </button>
              <button type="button" onClick={playNextAudio} disabled={!hasNext} aria-label={t.next}
                className="motion-press flex h-12 w-12 items-center justify-center rounded-full hover:bg-accent disabled:opacity-40">
                <SkipForward className="h-6 w-6 fill-current" />
              </button>
              <button type="button" onClick={cycleRepeat} aria-label={repeatLabel} aria-pressed={repeat !== 'off'} className={toggleButton(repeat !== 'off')}>
                <RepeatIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-2 flex justify-center">
              <button type="button" onClick={nextPlaybackSpeed} aria-label={t.speed}
                className="motion-press rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">{speed}×</button>
            </div>
          </div>
          <div role="tablist" aria-label={t.playlists} className="mx-4 mt-5 grid grid-cols-3 rounded-xl bg-muted p-1">
            {tabs.map((item) => (
              <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} onClick={() => setTab(item.key)}
                className={cn('truncate rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
                  tab === item.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                {item.label}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="pt-2">
            {tab === 'queue' ? <QueueList /> : tab === 'recent' ? <RecentList /> : <PlaylistsPanel />}
          </div>
        </div>
      </div>
    </ModalSurface>
  );
};

export const NowPlayingHost = () => {
  const open = useNowPlayingOpen();
  const hasTrack = useAudioPlayer((player) => !!player.track);
  const { mounted, closing } = useDelayedUnmount(open && hasTrack, EXIT_MS);
  useEffect(() => { if (!hasTrack) closeNowPlaying(); }, [hasTrack]);
  return (
    <>
      {mounted && hasTrack && <NowPlayingSheet closing={closing} />}
    </>
  );
};
