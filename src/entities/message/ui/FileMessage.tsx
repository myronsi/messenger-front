import { fetchMedia as authFetch } from '@/shared/api/fetchMedia';
import React, { useState } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { FileTypeConfig } from '@/shared/contexts/fileTypesConfig';
import { formatFileSize } from '@/shared/lib/formatFileSize';
import { UploadProgressBar } from './UploadProgress';

interface FileMessageProps {
  config: FileTypeConfig;
  fileName: string;
  fileUrl: string;
  isMobile: boolean;
  fileSize?: number;
  uploadProgress?: number;
}

const FileMessage: React.FC<FileMessageProps> = ({ config, fileName, fileUrl, isMobile, fileSize, uploadProgress }) => {
  const { translations, language } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);

  const handleDownload = async () => {
    try {
      const downloadUrl = fileUrl.includes('?') ? `${fileUrl}&download=1` : `${fileUrl}?download=1`;
      const response = await authFetch(downloadUrl, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: '*/*' },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadBlob = new Blob([blob], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(downloadBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const IconComponent = isMobile ? config.onHover : (isHovered ? config.onHover : config.icon);

  return (
    <div
      className="file-message flex items-center space-x-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button onClick={handleDownload} aria-label={`${translations.download || 'Download'}: ${fileName}`} className="focus:outline-none">
        <IconComponent size={20} className="cursor-pointer" />
      </button>
      <div className="min-w-0 max-w-[calc(100%-28px)] flex-1">
        <div className="truncate" title={fileName}>{fileName}</div>
        {fileSize ? <div data-testid="file-size" className="text-xs opacity-70">{formatFileSize(fileSize, language, translations)}</div> : null}
        {uploadProgress !== undefined && <UploadProgressBar progress={uploadProgress} />}
      </div>
    </div>
  );
};

export default FileMessage;
