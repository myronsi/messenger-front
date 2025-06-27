import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface AudioMessageProps {
  fileUrl: string;
  messageId: number;
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

const getAudioDuration = async (url: string): Promise<number> => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  try {
    const response = await fetch(url, { method: 'GET', mode: 'cors' });
    if (!response.ok) throw new Error('Failed to fetch audio');
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer.duration;
  } catch (error) {
    console.error('Ошибка получения длительности через AudioContext:', error);
    return 0;
  } finally {
    await audioContext.close();
  }
};

const AudioMessage: React.FC<AudioMessageProps> = ({
  fileUrl,
  messageId,
  playingMessageId,
  setPlayingMessageId,
  audioStates,
  setAudioStates,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [hasLoadedMetadata, setHasLoadedMetadata] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isDurationUnknown, setIsDurationUnknown] = useState(false);
  const isPlaying = playingMessageId === messageId;
  const audioState = audioStates[messageId] || { currentTime: 0, duration: 0 };
  const progress = audioState.duration > 0 && isFinite(audioState.duration) ? (audioState.currentTime / audioState.duration) * 100 : 0;

  const playMessage = () => {
    if (loadError) return;
    if (playingMessageId !== null && playingMessageId !== messageId) {
      const prevAudio = document.querySelector(`audio[data-message-id="${playingMessageId}"]`) as HTMLAudioElement;
      prevAudio?.pause();
    }
    const audio = audioRef.current;
    if (audio) {
      audio.play().catch((error) => {
        console.error('Ошибка воспроизведения аудио:', error);
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
        console.error('Ошибка загрузки аудио:', e);
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

  return (
    <div className="voice-message-player flex items-center space-x-2">
      <button
        onClick={() => (isPlaying ? pauseMessage() : playMessage())}
        disabled={loadError}
      >
        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
      </button>
      <div className="flex-1 flex flex-col items-center">
        <div className="progress-bar w-full h-2 bg-gray-200 rounded">
          <div className="progress h-full bg-blue-500 rounded" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-sm mt-1">
          {loadError ? 'Ошибка' : isDurationUnknown ? `${formatTime(audioState.currentTime)} / Неизвестно` : `${formatTime(audioState.currentTime)} / ${formatTime(audioState.duration)}`}
        </span>
      </div>
      <audio ref={audioRef} src={fileUrl} preload="auto" />
    </div>
  );
};

export default AudioMessage;
