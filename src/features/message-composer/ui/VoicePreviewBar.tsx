import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Pause, Play, Trash2 } from 'lucide-react';
import { analyzeAudio, formatAudioTime } from '@/entities/message';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { VoicePreview } from '../model/useVoiceRecorder';
import { isTrimmed, MIN_TRIM_SECONDS, type TrimRange } from '../model/trimAudio';
import { TrimHandle } from './TrimHandle';

const BARS = 32;
const SEEK_STEP = 2;
const roundButton = 'motion-press grid size-8 shrink-0 place-items-center rounded-full transition-colors';

interface VoicePreviewBarProps {
  preview: VoicePreview;
  onDiscard: () => void;
  onTrim: (range: TrimRange | null) => void;
}

export default function VoicePreviewBar({ preview, onDiscard, onTrim }: VoicePreviewBarProps) {
  const { translations: t } = useLanguage();
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(preview.seconds);
  const [waveform, setWaveform] = useState<number[]>(() => Array.from({ length: BARS }, () => 0.2));
  const range = preview.trim ?? { start: 0, end: duration };

  useEffect(() => {
    let active = true;
    analyzeAudio(preview.url).then((result) => {
      if (!active) return;
      setWaveform(result.waveform);
      if (Number.isFinite(result.duration) && result.duration > 0) setDuration(result.duration);
    }).catch(() => {});
    return () => { active = false; };
  }, [preview.url]);

  const seekTo = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const next = Math.min(range.end, Math.max(range.start, seconds));
    audio.currentTime = next;
    setPosition(next);
  };

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    if (audio.currentTime < range.start || audio.currentTime >= range.end - 0.05) seekTo(range.start);
    void audio.play().catch(() => setPlaying(false));
  };

  const secondsAt = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    return rect?.width ? Math.min(duration, Math.max(0, ((clientX - rect.left) / rect.width) * duration)) : 0;
  };

  const setEdge = (edge: keyof TrimRange, seconds: number) => {
    const next = edge === 'start'
      ? { start: Math.min(Math.max(0, seconds), range.end - MIN_TRIM_SECONDS), end: range.end }
      : { start: range.start, end: Math.max(Math.min(duration, seconds), range.start + MIN_TRIM_SECONDS) };
    if (next.end - next.start < MIN_TRIM_SECONDS) return;
    onTrim(isTrimmed(next, duration) ? next : null);
    audioRef.current?.pause();
    seekTo(next.start);
  };

  const onSeekKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') seekTo(position + SEEK_STEP);
    else if (event.key === 'ArrowLeft') seekTo(position - SEEK_STEP);
    else return;
    event.preventDefault();
  };

  const percent = (seconds: number) => (duration ? (seconds / duration) * 100 : 0);
  const played = duration ? position / duration : 0;
  return (
    <div data-testid="voice-preview" className="motion-reply-in flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-primary/10 pl-1 pr-3 text-sm text-foreground">
      <audio ref={audioRef} src={preview.url} preload="auto" className="hidden"
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => seekTo(range.start)}
        onTimeUpdate={(event) => {
          const time = event.currentTarget.currentTime;
          if (time >= range.end) {
            event.currentTarget.pause();
            seekTo(range.start);
          } else setPosition(time);
        }}
        onLoadedMetadata={(event) => {
          const seconds = event.currentTarget.duration;
          if (Number.isFinite(seconds) && seconds > 0) setDuration(seconds);
        }} />
      <button type="button" onPointerDown={(event) => event.preventDefault()} onClick={onDiscard} aria-label={t.voicePreviewDelete} title={t.voicePreviewDelete}
        className={`${roundButton} text-destructive hover:bg-destructive/15`}>
        <Trash2 className="size-4" />
      </button>
      <button type="button" onPointerDown={(event) => event.preventDefault()} onClick={toggle} aria-label={playing ? t.voicePreviewPause : t.voicePreviewPlay}
        className={`${roundButton} bg-primary text-primary-foreground hover:bg-primary/90`}>
        {playing ? <Pause className="size-4 fill-current" /> : <Play className="size-4 translate-x-px fill-current" />}
      </button>
      <div ref={trackRef} className="relative mx-2 flex h-8 min-w-0 flex-1 items-center">
        <div role="slider" tabIndex={0} aria-label={t.voicePreviewSeek} aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(position)}
          aria-valuetext={`${formatAudioTime(position)} / ${formatAudioTime(duration)}`}
          onPointerDown={(event: PointerEvent<HTMLDivElement>) => seekTo(secondsAt(event.clientX))} onKeyDown={onSeekKey}
          className="flex h-full w-full cursor-pointer items-center gap-[2px] overflow-hidden rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
          {waveform.map((level, index) => {
            const at = (index + 0.5) / waveform.length;
            const outside = at * duration < range.start || at * duration > range.end;
            return (
              <span key={index} className={`min-w-0 flex-1 rounded-full transition-colors ${outside ? 'bg-muted-foreground/20' : at <= played ? 'bg-primary' : 'bg-primary/35'}`}
                style={{ height: `${Math.max(12, Math.round(level * 100))}%` }} />
            );
          })}
        </div>
        {duration >= MIN_TRIM_SECONDS * 2 && (
          <>
            <TrimHandle edge="start" percent={percent(range.start)} seconds={range.start} label={t.voiceTrimStart}
              onMove={(clientX) => setEdge('start', secondsAt(clientX))} onStep={(delta) => setEdge('start', range.start + delta)} />
            <TrimHandle edge="end" percent={percent(range.end)} seconds={range.end} label={t.voiceTrimEnd}
              onMove={(clientX) => setEdge('end', secondsAt(clientX))} onStep={(delta) => setEdge('end', range.end + delta)} />
          </>
        )}
      </div>
      <span className="shrink-0 font-semibold tabular-nums text-muted-foreground">
        {formatAudioTime(playing || position > range.start ? position - range.start : range.end - range.start)}
      </span>
    </div>
  );
}
