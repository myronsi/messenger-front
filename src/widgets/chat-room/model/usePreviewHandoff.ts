import { useEffect, useRef } from 'react';

export const PREVIEW_HANDOFF_TIMEOUT_MS = 15_000;

interface PreviewHandoffOptions {
  isPreview: boolean;
  isLoadingHistory: boolean;
  messageCount: number;
  previewCount: number;
  clearPreviewMessages: () => void;
}

export const usePreviewHandoff = ({ isPreview, isLoadingHistory, messageCount, previewCount, clearPreviewMessages }: PreviewHandoffOptions) => {
  const loadStarted = useRef(false);
  const waiting = !isPreview && previewCount > 0;

  useEffect(() => {
    if (!waiting) {
      loadStarted.current = false;
      return;
    }
    if (messageCount > 0) {
      clearPreviewMessages();
      return;
    }
    if (isLoadingHistory) loadStarted.current = true;
    else if (loadStarted.current) clearPreviewMessages();
  }, [clearPreviewMessages, isLoadingHistory, messageCount, waiting]);

  useEffect(() => {
    if (!waiting) return;
    const timer = window.setTimeout(clearPreviewMessages, PREVIEW_HANDOFF_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [clearPreviewMessages, waiting]);
};
