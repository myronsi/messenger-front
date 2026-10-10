import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { analyzeAudio, FALLBACK_WAVEFORM, formatAudioTime, getAudioDuration, isValidWaveform } from '../model/audioMessageHelpers';
import type { Id } from '@/shared/lib/ids';

interface AudioMessageProps {
  fileUrl: string;
  messageId: Id;
  duration?: number;
  waveform?: number[];
  isPlaying: boolean;
  setPlayingMessageId: (id: Id | null) => void;
}

const isUsableDuration = (value: number | undefined): value is number => !!value && Number.isFinite(value) && value > 0;

// Playback progress lives here, so a timeupdate re-renders only this player. The parent
// only knows which message is playing. Duration and waveform come from the API when present;
// the audio file is fetched on first play (or just its metadata when the API has no duration).
const AudioMessage: React.FC<AudioMessageProps> = ({
  fileUrl,
  messageId,
  duration: metadataDuration,
  waveform: metadataWaveform,
  isPlaying,
  setPlayingMessageId,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(isUsableDuration(metadataDuration) ? metadataDuration : 0);
  const [loadError, setLoadError] = useState(false);
  const [isDurationUnknown, setIsDurationUnknown] = useState(false);
  const hasMetadataWaveform = isValidWaveform(metadataWaveform);
  const [analyzedWaveform, setAnalyzedWaveform] = useState<number[] | null>(null);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const waveform = hasMetadataWaveform ? metadataWaveform : analyzedWaveform ?? FALLBACK_WAVEFORM;
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
    audio.play().catch(() => setPlayingMessageId(null));
    setPlayingMessageId(messageId);
  };

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
      setPlayingMessageId(null);
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
  }, [fileUrl, setPlayingMessageId]);

  // Fallback only: without a stored waveform the file has to be downloaded and decoded,
  // so it is deferred until the user actually plays the message.
  useEffect(() => {
    if (hasMetadataWaveform || !hasStartedPlaying) return;
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

  const seekAudio = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!audioRef.current || !duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const nextTime = ratio * duration;
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  return (
    <div
      className="voice-message-player flex min-w-[220px] items-center gap-2"
      onClick={stopVoicePlayerPropagation}
      onContextMenu={stopVoicePlayerPropagation}
    >
      <button
        type="button"
        onClick={() => (isPlaying ? pauseMessage() : playMessage())}
        disabled={loadError}
        className="motion-press flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background/20 transition-colors hover:bg-background/30 disabled:opacity-50"
      >
        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <button
          type="button"
          onPointerDown={seekAudio}
          onClick={stopVoicePlayerPropagation}
          disabled={loadError || !duration}
          aria-label="Seek voice message"
          className="group flex h-9 w-full items-center gap-[2px] rounded-full px-0.5 disabled:cursor-default"
        >
          {waveform.map((barHeight, index) => {
            const barProgress = ((index + 0.5) / waveform.length) * 100;
            const isPlayed = barProgress <= progress;

            return (
              <span
                key={`${messageId}-waveform-${index}`}
                className={`block flex-1 rounded-full transition-all duration-150 ${
                  isPlayed ? 'bg-current opacity-95' : 'bg-current opacity-35'
                } ${isAnalyzingWaveform && !isWaveformReady ? 'animate-pulse' : ''}`}
                style={{ height: `${Math.round(8 + barHeight * 24)}px` }}
              />
            );
          })}
        </button>
        <span className="text-[11px] leading-none opacity-75">
          {loadError ? 'Ошибка' : isDurationUnknown ? `${formatAudioTime(currentTime)} / Неизвестно` : `${formatAudioTime(currentTime)} / ${formatAudioTime(duration)}`}
        </span>
      </div>
      <audio ref={audioRef} src={fileUrl} preload={isUsableDuration(metadataDuration) ? 'none' : 'metadata'} />
    </div>
  );
};

export default AudioMessage;
