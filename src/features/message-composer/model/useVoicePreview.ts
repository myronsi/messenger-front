import { useCallback, useRef, useState } from 'react';
import { trimAudio, type TrimRange } from './trimAudio';

export interface VoicePreview {
  blob: Blob;
  url: string;
  seconds: number;
  trim: TrimRange | null;
}

const CUT_FAILED_MESSAGE = 'The recording could not be cut. Try again or send it without cutting.';

export function useVoicePreview(upload: (audio: Blob) => Promise<void>, showError: (message: string) => void) {
  const [preview, setPreview] = useState<VoicePreview | null>(null);
  const previewRef = useRef<VoicePreview | null>(null);
  const sendingRef = useRef(false);

  const update = (next: VoicePreview | null) => {
    previewRef.current = next;
    setPreview(next);
  };

  const discardPreview = useCallback(() => {
    const current = previewRef.current;
    if (current) URL.revokeObjectURL(current.url);
    previewRef.current = null;
    setPreview(null);
  }, []);

  const showPreview = (blob: Blob, seconds: number) => {
    discardPreview();
    update({ blob, url: URL.createObjectURL(blob), seconds, trim: null });
  };

  const sendPreview = async () => {
    const current = previewRef.current;
    if (!current || sendingRef.current) return;
    sendingRef.current = true;
    try {
      const audio = current.trim ? await trimAudio(current.blob, current.trim) : current.blob;
      if (previewRef.current !== current) return;
      discardPreview();
      void upload(audio);
    } catch (error) {
      console.error('Error cutting voice message:', error);
      showError(CUT_FAILED_MESSAGE);
    } finally {
      sendingRef.current = false;
    }
  };

  const setPreviewTrim = (trim: TrimRange | null) => {
    const current = previewRef.current;
    if (current) update({ ...current, trim });
  };

  return { preview, showPreview, sendPreview, discardPreview, setPreviewTrim };
}
