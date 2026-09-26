import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface AudioMessageProps {
  fileUrl: string;
  messageId: number;
  duration?: number;
  waveform?: number[];
  playingMessageId: number | null;
  setPlayingMessageId: (id: number | null) => void;
  audioStates: { [key: number]: { currentTime: number; duration: number } };
  setAudioStates: React.Dispatch<React.SetStateAction<{ [key: number]: { currentTime: number; duration: number } }>>;
}

const formatTime = (time: number | undefined): string => {
  if (!time || isNaN(time) || !isFinite(time) || time < 0) {
    return '0:00';
  }
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const WAVEFORM_BAR_COUNT = 38;
const FALLBACK_WAVEFORM = Array.from({ length: WAVEFORM_BAR_COUNT }, (_, index) => {
  const wave = Math.sin(index * 0.75) * 0.24 + Math.sin(index * 1.7) * 0.12;
  return Math.min(0.9, Math.max(0.22, 0.46 + wave));
});

const createAudioContext = () => new (window.AudioContext || (window as any).webkitAudioContext)();

const analyzeAudio = async (url: string): Promise<{ duration: number; waveform: number[] }> => {
  const audioContext = createAudioContext();
  try {
    const response = await fetch(url, { method: 'GET', mode: 'cors' });
    if (!response.ok) throw new Error('Failed to fetch audio');
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const samplesPerBar = Math.max(1, Math.floor(channelData.length / WAVEFORM_BAR_COUNT));
    const rawBars = Array.from({ length: WAVEFORM_BAR_COUNT }, (_, barIndex) => {
      const start = barIndex * samplesPerBar;
      const end = barIndex === WAVEFORM_BAR_COUNT - 1
        ? channelData.length
        : Math.min(channelData.length, start + samplesPerBar);
      let sum = 0;
      let count = 0;
      const step = Math.max(1, Math.floor((end - start) / 120));

      for (let sampleIndex = start; sampleIndex < end; sampleIndex += step) {
        const sample = channelData[sampleIndex] || 0;
        sum += sample * sample;
        count += 1;
      }

      return count ? Math.sqrt(sum / count) : 0;
    });
    const peak = Math.max(...rawBars, 0.001);
    const waveform = rawBars.map((value) => Math.min(1, Math.max(0.16, value / peak)));

    return { duration: audioBuffer.duration, waveform };
  } finally {
    await audioContext.close();
  }
};

const isValidWaveform = (waveform: unknown): waveform is number[] => (
  Array.isArray(waveform) &&
  waveform.length > 0 &&
  waveform.every((value) => typeof value === 'number' && isFinite(value))
);

const getAudioDuration = async (url: string): Promise<number> => {
  const audioContext = createAudioContext();
  try {
    const response = await fetch(url, { method: 'GET', mode: 'cors' });
    if (!response.ok) throw new Error('Failed to fetch audio');
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer.duration;
  } catch (error) {
    return 0;
  } finally {
    await audioContext.close();
  }
};

const AudioMessage: React.FC<AudioMessageProps> = ({
  fileUrl,
  messageId,
  duration,
  waveform: metadataWaveform,
  playingMessageId,
  setPlayingMessageId,
  audioStates,
  setAudioStates,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [hasLoadedMetadata, setHasLoadedMetadata] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isDurationUnknown, setIsDurationUnknown] = useState(false);
  const [waveform, setWaveform] = useState(FALLBACK_WAVEFORM);
  const [isWaveformReady, setIsWaveformReady] = useState(false);
  const isPlaying = playingMessageId === messageId;
  const audioState = audioStates[messageId] || { currentTime: 0, duration: 0 };
  const progress = audioState.duration > 0 && isFinite(audioState.duration) ? (audioState.currentTime / audioState.duration) * 100 : 0;
  const hasMetadataWaveform = isValidWaveform(metadataWaveform);

  const stopVoicePlayerPropagation = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  const playMessage = () => {
    if (loadError) return;
    if (playingMessageId !== null && playingMessageId !== messageId) {
      const prevAudio = document.querySelector(`audio[data-message-id="${playingMessageId}"]`) as HTMLAudioElement;
      prevAudio?.pause();
    }
    const audio = audioRef.current;
    if (audio) {
      audio.play().catch((error) => {
        setPlayingMessageId(null);
      });
      setPlayingMessageId(messageId);
    }
  };

  const pauseMessage = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      setPlayingMessageId(null);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.setAttribute('data-message-id', messageId.toString());

      const handleTimeUpdate = () => {
        setAudioStates((prev) => ({
          ...prev,
          [messageId]: { ...prev[messageId], currentTime: audio.currentTime || 0 },
        }));
      };

      const handleLoadedData = () => {
        const duration = audio.duration;
        if (isFinite(duration) && duration > 0) {
          setAudioStates((prev) => ({
            ...prev,
            [messageId]: { ...prev[messageId], duration },
          }));
          setHasLoadedMetadata(true);
          setLoadError(false);
          setIsDurationUnknown(false);
        } else {
          getAudioDuration(fileUrl).then((duration) => {
            if (isFinite(duration) && duration > 0) {
              setAudioStates((prev) => ({
                ...prev,
                [messageId]: { ...prev[messageId], duration },
              }));
              setHasLoadedMetadata(true);
              setLoadError(false);
              setIsDurationUnknown(false);
            } else {
              setIsDurationUnknown(true);
              setHasLoadedMetadata(true);
              setLoadError(false);
            }
          });
        }
      };

      const handleError = (e: Event) => {
        setLoadError(true);
        setIsDurationUnknown(false);
        setAudioStates((prev) => ({
          ...prev,
          [messageId]: { ...prev[messageId], duration: 0 },
        }));
      };

      const handleEnded = () => {
        setPlayingMessageId(null);
        setAudioStates((prev) => ({
          ...prev,
          [messageId]: { ...prev[messageId], currentTime: 0 },
        }));
        if (audio) audio.currentTime = 0;
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('loadeddata', handleLoadedData);
      audio.addEventListener('error', handleError);
      audio.addEventListener('ended', handleEnded);

      audio.load();

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('loadeddata', handleLoadedData);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [fileUrl, messageId, setAudioStates, setPlayingMessageId]);

  useEffect(() => {
    if (!duration || !isFinite(duration) || duration <= 0) return;

    setAudioStates((prev) => ({
      ...prev,
      [messageId]: { ...prev[messageId], duration },
    }));
    setHasLoadedMetadata(true);
    setLoadError(false);
    setIsDurationUnknown(false);
  }, [duration, messageId, setAudioStates]);

  useEffect(() => {
    let isMounted = true;

    if (hasMetadataWaveform) {
      setWaveform(metadataWaveform);
      setIsWaveformReady(true);
      return () => {
        isMounted = false;
      };
    }

    setWaveform(FALLBACK_WAVEFORM);
    setIsWaveformReady(false);

    analyzeAudio(fileUrl)
      .then(({ duration, waveform }) => {
        if (!isMounted) return;
        setWaveform(waveform);
        setIsWaveformReady(true);
        if (isFinite(duration) && duration > 0) {
          setAudioStates((prev) => ({
            ...prev,
            [messageId]: { ...prev[messageId], duration },
          }));
          setHasLoadedMetadata(true);
          setLoadError(false);
          setIsDurationUnknown(false);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setWaveform(FALLBACK_WAVEFORM);
        setIsWaveformReady(false);
      });

    return () => {
      isMounted = false;
    };
  }, [fileUrl, hasMetadataWaveform, messageId, metadataWaveform, setAudioStates]);

  const seekAudio = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!audioRef.current || !audioState.duration || !isFinite(audioState.duration)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const nextTime = ratio * audioState.duration;
    audioRef.current.currentTime = nextTime;
    setAudioStates((prev) => ({
      ...prev,
      [messageId]: { ...prev[messageId], currentTime: nextTime },
    }));
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
          disabled={loadError || !audioState.duration}
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
                } ${isWaveformReady ? '' : 'animate-pulse'}`}
                style={{ height: `${Math.round(8 + barHeight * 24)}px` }}
              />
            );
          })}
        </button>
        <span className="text-[11px] leading-none opacity-75">
          {loadError ? 'Ошибка' : isDurationUnknown ? `${formatTime(audioState.currentTime)} / Неизвестно` : `${formatTime(audioState.currentTime)} / ${formatTime(audioState.duration)}`}
        </span>
      </div>
      <audio ref={audioRef} src={fileUrl} preload="auto" />
    </div>
  );
};

export default AudioMessage;
