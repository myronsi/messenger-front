import { useEffect, useRef, useState } from 'react';
import { uploadWithProgress } from '@/shared/api/uploadWithProgress';

const BASE_URL = import.meta.env.VITE_BASE_URL;
const OPUS_AUDIO_BITS_PER_SECOND = 48_000;
const MIN_RECORDING_MS = 1000;
const RECORDING_TOO_SHORT_MESSAGE = 'Recording was too short and was not sent. Tap the mic to start, then tap stop when you are done.';
const OPUS_MIME_TYPES = [
  'audio/ogg;codecs=opus',
  'audio/ogg; codecs=opus',
  'audio/webm;codecs=opus',
  'audio/webm; codecs=opus',
];

interface RecordingSession {
  chunks: Blob[];
  startedAt: number;
  discard: boolean;
}

interface VoiceRecorderOptions {
  chatId: number;
  isDisabled: boolean;
  disableVoice: boolean;
  onVoiceUploadStart?: (file: Blob, fileName: string, fileType?: string) => number | null;
  onVoiceUploadProgress?: (messageId: number, percent: number) => void;
  onVoiceUploadError?: (messageId: number, errorMessage?: string) => void;
  onVoiceUploadComplete?: (messageId: number) => void;
}

const getSupportedOpusMimeType = () => {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  return OPUS_MIME_TYPES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || '';
};

const getVoiceMessageFileName = (mimeType: string) => (
  mimeType.includes('webm') ? 'voice_message.webm' : 'voice_message.opus'
);

export const useVoiceRecorder = ({
  chatId,
  isDisabled,
  disableVoice,
  onVoiceUploadStart,
  onVoiceUploadProgress,
  onVoiceUploadError,
  onVoiceUploadComplete,
}: VoiceRecorderOptions) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingSessionRef = useRef<RecordingSession | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingIntentRef = useRef(false);

  const startRecording = async () => {
    if (disableVoice || isDisabled) return;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        setErrorMessage('Voice recording is not supported in this browser.');
        return;
      }
      const opusMimeType = getSupportedOpusMimeType();
      if (!opusMimeType) {
        setErrorMessage('Opus voice recording is not supported in this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!recordingIntentRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const session: RecordingSession = { chunks: [], startedAt: 0, discard: false };
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: opusMimeType,
        audioBitsPerSecond: OPUS_AUDIO_BITS_PER_SECOND,
      });
      mediaRecorderRef.current = mediaRecorder;
      recordingSessionRef.current = session;

      const releaseRecorder = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (streamRef.current === stream) streamRef.current = null;
        if (mediaRecorderRef.current === mediaRecorder) mediaRecorderRef.current = null;
        if (recordingSessionRef.current === session) recordingSessionRef.current = null;
      };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) session.chunks.push(event.data);
      };
      mediaRecorder.onstop = async () => {
        if (session.discard) {
          session.chunks = [];
          releaseRecorder();
          return;
        }
        const audioBlob = new Blob(session.chunks, { type: mediaRecorder.mimeType || opusMimeType });
        session.chunks = [];
        if (audioBlob.size === 0) {
          setErrorMessage('Voice message was empty. Please try recording again.');
          releaseRecorder();
          return;
        }

        const formData = new FormData();
        const voiceFileName = getVoiceMessageFileName(audioBlob.type);
        const optimisticMessageId = onVoiceUploadStart?.(audioBlob, voiceFileName, 'voice') ?? null;
        formData.append('file', audioBlob, voiceFileName);
        formData.append('chat_id', chatId.toString());
        try {
          await uploadWithProgress({
            url: `${BASE_URL}/messages/vm`,
            formData,
            onProgress: (percent) => {
              if (optimisticMessageId !== null) onVoiceUploadProgress?.(optimisticMessageId, percent);
            },
          });
          if (optimisticMessageId !== null) onVoiceUploadComplete?.(optimisticMessageId);
        } catch (error) {
          console.error('Error sending voice message:', error);
          if (optimisticMessageId !== null) {
            onVoiceUploadError?.(optimisticMessageId, 'Failed to send voice message. Please try again.');
          }
          setErrorMessage('Failed to send voice message. Please try again.');
        } finally {
          releaseRecorder();
        }
      };
      mediaRecorder.start();
      session.startedAt = performance.now();
      setIsRecording(true);
      setErrorMessage(null);
      timerRef.current = setInterval(() => setRecordingDuration((prev) => prev + 1), 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setErrorMessage('Microphone access was denied. Please allow access in your browser settings.');
      } else if (error instanceof DOMException && error.name === 'NotFoundError') {
        setErrorMessage('No microphone found. Please connect a microphone and try again.');
      } else {
        setErrorMessage('Failed to access microphone. Please check your settings.');
      }
      if (!mediaRecorderRef.current && streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  };

  const stopRecording = ({ discard = false }: { discard?: boolean } = {}) => {
    recordingIntentRef.current = false;
    const session = recordingSessionRef.current;
    const recorder = mediaRecorderRef.current;
    if (session && recorder && recorder.state !== 'inactive') {
      if (discard) {
        session.discard = true;
      } else if (performance.now() - session.startedAt < MIN_RECORDING_MS) {
        session.discard = true;
        setErrorMessage(RECORDING_TOO_SHORT_MESSAGE);
      }
      recorder.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setRecordingDuration(0);
  };

  useEffect(() => () => {
    stopRecording({ discard: true });
    if (streamRef.current && !mediaRecorderRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  const handleStartRecording = async () => {
    if (disableVoice || isDisabled) return;
    recordingIntentRef.current = true;
    setIsStarting(true);
    try {
      await startRecording();
    } finally {
      setIsStarting(false);
      if (mediaRecorderRef.current?.state !== 'recording') recordingIntentRef.current = false;
    }
  };

  return {
    isRecording,
    isStarting,
    recordingDuration,
    errorMessage,
    setErrorMessage,
    stopRecording,
    handleStartRecording,
  };
};
