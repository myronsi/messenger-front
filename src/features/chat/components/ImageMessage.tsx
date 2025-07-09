import React from 'react';

interface ImageMessageProps {
  fileUrl: string;
  fileName: string;
  isMine: boolean;
}

const ImageMessage: React.FC<ImageMessageProps> = ({ fileUrl, fileName }) => {
  return (
    <img
      src={fileUrl}
      alt={fileName}
      className="max-w-full h-auto select-none rounded-2xl"
      style={{ maxHeight: '300px' }}
    />
  );
};

export default ImageMessage;