import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { FileTypeConfig } from '@/shared/contexts/fileTypesConfig';
import { formatFileSize } from '@/shared/lib/formatFileSize';
import { DownloadButton, fillPercent } from './DownloadButton';
import { ProgressCircle } from './UploadProgress';

interface FileMessageProps {
  config: FileTypeConfig;
  fileName: string;
  fileUrl: string;
  isMobile: boolean;
  fileSize?: number;
  uploadProgress?: number;
  onCancelUpload?: () => void;
}

const FileMessage: React.FC<FileMessageProps> = ({ config, fileName, fileUrl, isMobile, fileSize, uploadProgress, onCancelUpload }) => {
  const { translations, language } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const IconComponent = isMobile ? config.onHover : (isHovered ? config.onHover : config.icon);
  const uploading = uploadProgress !== undefined;
  const status = uploading ? fillPercent(translations.uploadProgress, uploadProgress) : downloadStatus;

  return (
    <div
      className="file-message flex items-center gap-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {uploading ? (
        <button type="button" onClick={onCancelUpload} disabled={!onCancelUpload} data-testid="cancel-upload"
          aria-label={`${translations.cancelUpload}: ${fileName}`} className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2">
          <ProgressCircle progress={uploadProgress} label={status ?? ''}><X size={16} /></ProgressCircle>
        </button>
      ) : (
        <DownloadButton fileUrl={fileUrl} fileName={fileName} onProgressChange={setDownloadStatus}
          icon={<IconComponent size={20} className="cursor-pointer" />} />
      )}
      <div className="min-w-0 max-w-[calc(100%-40px)] flex-1">
        <div className="truncate" title={fileName}>{fileName}</div>
        <div className="text-xs opacity-70">
          {fileSize ? <span data-testid="file-size">{formatFileSize(fileSize, language, translations)}</span> : null}
          {status && <span data-testid="file-transfer-status">{fileSize ? ' · ' : ''}{status}</span>}
        </div>
      </div>
    </div>
  );
};

export default FileMessage;
