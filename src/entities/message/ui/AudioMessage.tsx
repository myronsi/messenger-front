import { useAuthenticatedMedia } from '@/shared/api/useAuthenticatedMedia';
import type { EntityId } from '@/shared/api/entityId';
import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { nextPlaybackSpeed, usePlaybackSpeed } from '../model/playbackSpeed';
import { audioPosition, pauseAudio, seekAudio, useAudioPlayer } from '../model/audioPlayer';
import { analyzeAudio, FALLBACK_WAVEFORM, formatAudioTime, isValidWaveform, normalizeWaveform } from '../model/audioMessageHelpers';
import AudioProgress from './AudioProgress';

interface AudioMessageProps {
  fileUrl: string;
  messageId: EntityId;
  duration?: number;
  waveform?: number[];
  isMine?: boolean;
  variant?: 'voice' | 'music';
  onPlay: (startAt?: number) => void;
}

const MIN_WIDTH = 200;
const MAX_WIDTH = 300;
const DEFAULT_WIDTH = 240;

const isUsableDuration = (value: number | undefined): value is number => !!value && Number.isFinite(value) && value > 0;

const AudioMessage: React.FC<AudioMessageProps> = ({
  fileUrl: sourceFileUrl,
  messageId,
  duration: metadataDuration,
  waveform: metadataWaveform,
  isMine = false,
  variant = 'voice',
  onPlay,
}) => {
  const speed = usePlaybackSpeed();
  const seekingRef = useRef(false);
  const active = useAudioPlayer((player) => player.track?.id === messageId);
  const isPlaying = useAudioPlayer((player) => player.track?.id === messageId && (player.playing || player.loading));
  const ticking = useAudioPlayer((player) => player.track?.id === messageId && player.playing);
  const playerTime = useAudioPlayer((player) => (player.track?.id === messageId ? player.time : 0));
  const playerDuration = useAudioPlayer((player) => (player.track?.id === messageId ? player.duration : 0));
  const loadError = useAudioPlayer((player) => player.track?.id === messageId && player.error);
  const [smoothTime, setSmoothTime] = useState<number | null>(null);
  const hasMetadataWaveform = isValidWaveform(metadataWaveform);
  const needsAnalysis = variant === 'voice' && !hasMetadataWaveform;
  const [analyzed, setAnalyzed] = useState<{ waveform: number[]; duration?: number } | null>(null);
  const analysisUrl = useAuthenticatedMedia(sourceFileUrl, undefined, needsAnalysis && active) || '';
  const waveform = normalizeWaveform(hasMetadataWaveform ? metadataWaveform : analyzed?.waveform ?? FALLBACK_WAVEFORM);
  const duration = isUsableDuration(playerDuration) ? playerDuration
    : isUsableDuration(metadataDuration) ? metadataDuration : analyzed?.duration ?? 0;
  const currentTime = active ? smoothTime ?? playerTime : 0;
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  useEffect(() => {
    if (!needsAnalysis || !analysisUrl || analyzed) return;
    let isMounted = true;
    analyzeAudio(analysisUrl)
      .then(({ duration: analyzedDuration, waveform: bars }) => {
        if (isMounted) setAnalyzed({ waveform: bars, duration: isUsableDuration(analyzedDuration) ? analyzedDuration : undefined });
      })
      .catch(() => {
        if (isMounted) setAnalyzed({ waveform: FALLBACK_WAVEFORM });
      });
    return () => { isMounted = false; };
  }, [analysisUrl, analyzed, needsAnalysis]);

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

  const stopPropagation = (event: React.SyntheticEvent) => event.stopPropagation();

  const seekTo = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    if (active) seekAudio(ratio * duration);
    else onPlay(ratio * duration);
  };

  const startSeek = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    seekingRef.current = true;
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch (error) {
      if (!(error instanceof DOMException)) throw error;
    }
    seekTo(event);
  };

  const width = duration > 0 ? Math.round(MIN_WIDTH + Math.min(1, Math.max(0, (duration - 2) / 28)) * (MAX_WIDTH - MIN_WIDTH)) : DEFAULT_WIDTH;
  const shownTime = loadError ? '--:--' : active && (isPlaying || currentTime > 0)
    ? formatAudioTime(currentTime)
    : duration ? formatAudioTime(duration) : '--:--';
  const label = variant === 'music' ? 'audio' : 'voice message';

  return (
    <div
      className="voice-message-player flex max-w-full min-w-0 items-center gap-2.5 py-0.5"
      style={{ width }}
      onClick={stopPropagation}
      onContextMenu={stopPropagation}
    >
      <button
        type="button"
        onClick={() => (isPlaying ? pauseAudio() : onPlay())}
        aria-label={`${isPlaying ? 'Pause' : 'Play'} ${label}`}
        className={`motion-press relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-sm transition-colors disabled:opacity-50 ${
          isMine ? 'bg-primary-foreground text-primary hover:bg-primary-foreground/90' : 'bg-primary text-primary-foreground hover:bg-primary/90'
        }`}
      >
        <span className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ease-out ${isPlaying ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0'}`}>
          <Pause className="h-5 w-5 fill-current" />
        </span>
        <span className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ease-out ${isPlaying ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}>
          <Play className="ml-0.5 h-5 w-5 fill-current" />
        </span>
      </button>
      <div className={`flex min-w-0 flex-1 ${variant === 'music' ? 'items-center gap-2' : 'flex-col gap-1'}`}>
        <button
          type="button"
          onPointerDown={startSeek}
          onPointerMove={(event) => { if (seekingRef.current && active) seekTo(event); }}
          onPointerUp={() => { seekingRef.current = false; }}
          onPointerCancel={() => { seekingRef.current = false; }}
          onClick={stopPropagation}
          disabled={loadError || !duration}
          aria-label={`Seek ${label}`}
          className={`relative h-7 min-w-0 shrink-0 touch-none overflow-hidden disabled:cursor-default ${variant === 'music' ? 'flex-1' : 'w-full'} ${
            isMine ? 'text-primary-foreground' : 'text-primary'}`}
        >
          <AudioProgress variant={variant} messageId={messageId} waveform={waveform} progress={progress}
            pulse={needsAnalysis && active && !analyzed} />
        </button>
        <div className={`flex h-4 shrink-0 items-center gap-2 text-[11px] leading-none ${variant === 'music' ? 'flex-row-reverse' : ''}`}>
          <span className="tabular-nums opacity-80">{shownTime}</span>
          <button
            type="button"
            tabIndex={isPlaying ? 0 : -1}
            aria-hidden={!isPlaying}
            onClick={(event) => {
              event.stopPropagation();
              nextPlaybackSpeed();
            }}
            aria-label="Playback speed"
            className={`motion-press flex h-4 items-center rounded-full px-1.5 text-[10px] font-semibold transition-opacity ${
              isPlaying ? 'opacity-100' : 'pointer-events-none opacity-0'
            } ${isMine ? 'bg-primary-foreground/20' : 'bg-primary/15 text-primary'}`}
          >
            {speed}×
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudioMessage;
