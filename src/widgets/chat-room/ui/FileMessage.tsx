import React, { useState } from 'react';
import type { FileTypeConfig } from '@/shared/contexts/fileTypesConfig';

interface FileMessageProps {
  config: FileTypeConfig;
  fileName: string;
  fileUrl: string;
  isMobile: boolean;
}

const FileMessage: React.FC<FileMessageProps> = ({ config, fileName, fileUrl, isMobile }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleDownload = async () => {
    try {
      const downloadUrl = fileUrl.includes('?') ? `${fileUrl}&download=1` : `${fileUrl}?download=1`;
      const response = await fetch(downloadUrl, {
        method: 'GET',
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
      <button onClick={handleDownload} className="focus:outline-none">
        <IconComponent size={20} className="cursor-pointer" />
      </button>
      <span className="truncate max-w-[calc(100%-28px)]" title={fileName}>
        {fileName}
      </span>
    </div>
  );
};

export default FileMessage;
