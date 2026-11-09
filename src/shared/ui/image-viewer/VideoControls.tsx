import type { CSSProperties } from 'react';
import { Pause, Play, RotateCcw, RotateCw, Volume1, Volume2, VolumeX } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { VideoSpeedMenu } from './VideoSpeedMenu';
import { formatVideoTime, seekBy, setVolume, SKIP_SECONDS, toggleMute, togglePlayback } from './videoPlayback';

export interface Playback { playing: boolean; time: number; duration: number; volume: number; muted: boolean; rate: number }

const iconButton = 'grid shrink-0 place-items-center rounded-full transition-colors hover:bg-white/15 active:scale-95 disabled:opacity-40';
const rangeClass = 'min-w-0 cursor-pointer appearance-none rounded-full bg-transparent text-white disabled:cursor-default '
  + '[&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-moz-range-track]:h-1 [&::-moz-range-track]:bg-transparent '
  + '[&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none '
  + '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-current [&::-webkit-slider-thumb]:shadow '
  + '[&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-current';
const filled = (percent: number): CSSProperties => ({
  ['--fill' as string]: `${percent}%`,
  background: `linear-gradient(to right, currentColor var(--fill), rgba(255,255,255,0.25) var(--fill)) center / 100% 4px no-repeat`,
});

interface VideoControlsProps {
  video: HTMLVideoElement | null;
  playback: Playback;
  visible: boolean;
}

export function VideoControls({ video, playback, visible }: VideoControlsProps) {
  const { translations: t } = useLanguage();
  const progress = playback.duration ? Math.min(100, (playback.time / playback.duration) * 100) : 0;
  const volume = playback.muted ? 0 : playback.volume;
  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const skipLabel = (label: string) => label.replace('{count}', String(SKIP_SECONDS));

  return (
    <div
      data-testid="viewer-video-controls"
      data-viewer-controls
      className={`absolute inset-x-3 bottom-3 z-[10000] mx-auto max-w-2xl transition-[opacity,transform] duration-300 ease-out sm:bottom-6 ${visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'}`}
    >
      <div className="rounded-2xl bg-black/60 px-2 pb-1.5 pt-2 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-xl sm:px-3">
        <input
          type="range" min={0} max={playback.duration || 1} step="any" value={Math.min(playback.time, playback.duration || 0)}
          disabled={!playback.duration} aria-label={t.seekVideo}
          onChange={(event) => { if (video) video.currentTime = event.currentTarget.valueAsNumber; }}
          className={`${rangeClass} block h-4 w-full`} style={filled(progress)}
        />
        <div className="mt-0.5 flex items-center gap-0.5 sm:gap-1">
          <button type="button" disabled={!video} onClick={() => video && togglePlayback(video)}
            aria-label={playback.playing ? t.pauseVideo : t.playVideo} className={`${iconButton} size-10`}>
            {playback.playing
              ? <Pause className="size-5" fill="currentColor" strokeWidth={0} />
              : <Play className="ml-0.5 size-5" fill="currentColor" strokeWidth={0} />}
          </button>
          <button type="button" disabled={!video} onClick={() => video && seekBy(video, -SKIP_SECONDS)}
            aria-label={skipLabel(t.videoRewind)} title={skipLabel(t.videoRewind)} className={`${iconButton} size-9 max-sm:hidden`}>
            <RotateCcw className="size-[18px]" />
          </button>
          <button type="button" disabled={!video} onClick={() => video && seekBy(video, SKIP_SECONDS)}
            aria-label={skipLabel(t.videoForward)} title={skipLabel(t.videoForward)} className={`${iconButton} size-9 max-sm:hidden`}>
            <RotateCw className="size-[18px]" />
          </button>
          <div className="group/volume flex items-center">
            <button type="button" disabled={!video} onClick={() => video && toggleMute(video)}
              aria-label={volume === 0 ? t.unmuteVideo : t.mute} className={`${iconButton} size-9`}>
              <VolumeIcon className="size-[18px]" />
            </button>
            <input
              type="range" min={0} max={1} step={0.05} value={volume} disabled={!video} aria-label={t.videoVolume}
              onChange={(event) => video && setVolume(video, event.currentTarget.valueAsNumber)}
              className={`${rangeClass} h-4 w-16 sm:w-20`} style={filled(volume * 100)}
            />
          </div>
          <span className="ml-1.5 truncate text-xs tabular-nums text-white/80">
            {formatVideoTime(playback.time)}<span className="text-white/45"> / {formatVideoTime(playback.duration)}</span>
          </span>
          <span className="flex-1" />
          <VideoSpeedMenu rate={playback.rate} disabled={!video} onChange={(rate) => { if (video) video.playbackRate = rate; }} />
        </div>
      </div>
    </div>
  );
}
