import { useAuthenticatedMedia } from '@/shared/api/useAuthenticatedMedia';
import type { EntityId } from '@/shared/api/entityId';
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { nextPlaybackSpeed, usePlaybackSpeed } from '../model/playbackSpeed';
import { analyzeAudio, FALLBACK_WAVEFORM, formatAudioTime, getAudioDuration, isValidWaveform, normalizeWaveform } from '../model/audioMessageHelpers';

interface AudioMessageProps {
  fileUrl: string;
  messageId: EntityId;
  duration?: number;
  waveform?: number[];
  isPlaying: boolean;
  isMine?: boolean;
  setPlayingMessageId: (id: EntityId | null, endedId?: EntityId) => void;
}


const MIN_WIDTH = 200;
const MAX_WIDTH = 300;
const DEFAULT_WIDTH = 240;

const isUsableDuration = (value: number | undefined): value is number => !!value && Number.isFinite(value) && value > 0;

// Playback progress lives here, so a timeupdate re-renders only this player. The parent
// only knows which message is playing. Duration and waveform come from the API when present;
// the audio file is fetched on first play (or just its metadata when the API has no duration).
const AudioMessage: React.FC<AudioMessageProps> = ({
  fileUrl: sourceFileUrl,
  messageId,
  duration: metadataDuration,
  waveform: metadataWaveform,
  isPlaying,
  isMine = false,
  setPlayingMessageId,
}) => {
  const speed = usePlaybackSpeed();
  const seekingRef = useRef(false);
  const [mediaRequested, setMediaRequested] = useState(false);
  const fileUrl = useAuthenticatedMedia(sourceFileUrl, undefined, mediaRequested) || '';
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(isUsableDuration(metadataDuration) ? metadataDuration : 0);
  const [loadError, setLoadError] = useState(false);
  const [isDurationUnknown, setIsDurationUnknown] = useState(false);
  const hasMetadataWaveform = isValidWaveform(metadataWaveform);
  const [analyzedWaveform, setAnalyzedWaveform] = useState<number[] | null>(null);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const waveform = normalizeWaveform(hasMetadataWaveform ? metadataWaveform : analyzedWaveform ?? FALLBACK_WAVEFORM);
  const isWaveformReady = hasMetadataWaveform || analyzedWaveform !== null;
  const isAnalyzingWaveform = !hasMetadataWaveform && hasStartedPlaying && analyzedWaveform === null;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const stopVoicePlayerPropagation = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  const playMessage = () => {
    const audio = audioRef.current;
    if (loadError || !audio) return;
    setHasStartedPlaying(true);
    setMediaRequested(true);
    if (fileUrl) audio.play().catch(() => setPlayingMessageId(null));
    setPlayingMessageId(messageId);
  };

  useEffect(() => {
    if (!isPlaying || loadError) return;
    setHasStartedPlaying(true);
    setMediaRequested(true);
  }, [isPlaying, loadError]);

  useEffect(() => {
    if (fileUrl && isPlaying) void audioRef.current?.play().catch(() => setPlayingMessageId(null));
  }, [fileUrl, isPlaying, setPlayingMessageId]);

  const pauseMessage = () => {
    audioRef.current?.pause();
    setPlayingMessageId(null);
  };

  // Another message started playing (or this one was stopped from outside).
  useEffect(() => {
    const audio = audioRef.current;
    if (!isPlaying && audio && !audio.paused) audio.pause();
  }, [isPlaying]);

  useEffect(() => {
    setDuration(isUsableDuration(metadataDuration) ? metadataDuration : 0);
    setCurrentTime(0);
    setLoadError(false);
    setIsDurationUnknown(false);
  }, [fileUrl, metadataDuration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let isMounted = true;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const handleLoadedMetadata = () => {
      if (isUsableDuration(audio.duration)) {
        setDuration(audio.duration);
        setIsDurationUnknown(false);
        return;
      }
      // Recorded webm/ogg often reports Infinity until decoded.
      void getAudioDuration(fileUrl).then((decoded) => {
        if (!isMounted) return;
        if (isUsableDuration(decoded)) setDuration(decoded);
        else setIsDurationUnknown(true);
      });
    };
    const handleError = () => {
      setLoadError(true);
      setIsDurationUnknown(false);
    };
    const handleEnded = () => {
      setPlayingMessageId(null, messageId);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);
    return () => {
      isMounted = false;
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [fileUrl, messageId, setPlayingMessageId]);

  // Fallback only: without a stored waveform the file has to be downloaded and decoded,
  // so it is deferred until the user actually plays the message.
  useEffect(() => {
    if (hasMetadataWaveform || !hasStartedPlaying || !fileUrl) return;
    let isMounted = true;
    analyzeAudio(fileUrl)
      .then(({ duration: analyzedDuration, waveform: bars }) => {
        if (!isMounted) return;
        setAnalyzedWaveform(bars);
        if (isUsableDuration(analyzedDuration)) {
          setDuration((current) => current || analyzedDuration);
          setIsDurationUnknown(false);
        }
      })
      .catch(() => {
        if (isMounted) setAnalyzedWaveform(FALLBACK_WAVEFORM);
      });
    return () => {
      isMounted = false;
    };
  }, [fileUrl, hasMetadataWaveform, hasStartedPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!isPlaying || !audio) return undefined;
    let frame = requestAnimationFrame(function tick() {
      setCurrentTime(audio.currentTime || 0);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, fileUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.defaultPlaybackRate = speed;
    audio.playbackRate = speed;
  }, [speed, fileUrl]);

  const seekTo = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const nextTime = ratio * duration;
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
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

  const shownTime = loadError ? '--:--' : isPlaying || currentTime > 0
    ? formatAudioTime(currentTime)
    : isDurationUnknown || !duration ? '--:--' : formatAudioTime(duration);

  return (
    <div
      className="voice-message-player flex max-w-full min-w-0 items-center gap-2.5 py-0.5"
      style={{ width }}
      onClick={stopVoicePlayerPropagation}
      onContextMenu={stopVoicePlayerPropagation}
    >
      <button
        type="button"
        onClick={() => (isPlaying ? pauseMessage() : playMessage())}
        disabled={loadError}
        aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
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
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <button
          type="button"
          onPointerDown={startSeek}
          onPointerMove={(event) => { if (seekingRef.current) seekTo(event); }}
          onPointerUp={() => { seekingRef.current = false; }}
          onPointerCancel={() => { seekingRef.current = false; }}
          onClick={stopVoicePlayerPropagation}
          disabled={loadError || !duration}
          aria-label="Seek voice message"
          className={`relative h-7 w-full min-w-0 touch-none overflow-hidden disabled:cursor-default ${isMine ? 'text-primary-foreground' : 'text-primary'}`}
        >
          {[false, true].map((played) => (
            <span
              key={played ? 'played' : 'rest'}
              aria-hidden={played}
              className={`absolute inset-0 flex items-center gap-[2px] ${played ? '' : 'opacity-35'}`}
              style={played ? { clipPath: `inset(0 ${100 - progress}% 0 0)` } : undefined}
            >
              {waveform.map((barHeight, index) => (
                <span
                  key={`${messageId}-waveform-${index}`}
                  data-testid={played ? undefined : 'waveform-bar'}
                  className={`block min-w-[2px] flex-1 rounded-full bg-current ${isAnalyzingWaveform && !isWaveformReady ? 'animate-pulse' : ''}`}
                  style={{ height: `${Math.round(3 + barHeight * 22)}px` }}
                />
              ))}
            </span>
          ))}
        </button>
        <div className="flex h-4 items-center gap-2 text-[11px] leading-none">
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
      <audio ref={audioRef} src={fileUrl} preload={isUsableDuration(metadataDuration) ? 'none' : 'metadata'} />
    </div>
  );
};

export default AudioMessage;
