import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { downloadFile } from '@/shared/lib/downloadFile';
import { ProgressCircle } from './UploadProgress';

type Download = { progress: number | null; controller: AbortController };

export const fillPercent = (template: string | undefined, progress: number) =>
  (template || '{percent}%').replace('{percent}', String(Math.round(progress)));

interface DownloadButtonProps {
  fileUrl: string;
  fileName: string;
  icon: React.ReactNode;
  onProgressChange?: (status: string | null) => void;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({ fileUrl, fileName, icon, onProgressChange }) => {
  const { translations } = useLanguage();
  const [download, setDownload] = useState<Download | null>(null);
  const downloadRef = useRef<Download | null>(null);
  const progressRef = useRef(onProgressChange);
  progressRef.current = onProgressChange;
  const isCurrent = (controller: AbortController) => downloadRef.current?.controller === controller;
  const status = download?.progress != null ? fillPercent(translations.downloadProgress, download.progress) : null;

  useEffect(() => () => downloadRef.current?.controller.abort(), []);
  useEffect(() => { progressRef.current?.(status); }, [status]);

  const update = (next: Download | null) => {
    downloadRef.current = next;
    setDownload(next);
  };

  const handleClick = async () => {
    if (downloadRef.current) {
      downloadRef.current.controller.abort();
      update(null);
      return;
    }
    const controller = new AbortController();
    update({ progress: null, controller });
    await downloadFile(fileUrl, fileName, {
      signal: controller.signal,
      onProgress: (progress) => { if (isCurrent(controller)) update({ progress, controller }); },
    });
    if (isCurrent(controller)) update(null);
  };

  return (
    <button type="button" onClick={() => void handleClick()} data-testid="download-file"
      aria-label={`${download ? translations.cancelDownload : translations.download || 'Download'}: ${fileName}`}
      className="grid size-8 shrink-0 place-items-center rounded-full focus:outline-none focus-visible:ring-2">
      {download ? <ProgressCircle progress={download.progress} label={status ?? translations.download}><X size={14} /></ProgressCircle> : icon}
    </button>
  );
};
