import React from 'react';

interface ImageMessageProps {
  fileUrl: string;
  fileName: string;
}

const ImageMessage: React.FC<ImageMessageProps> = ({ fileUrl, fileName }) => {
  return (
    <img
      src={fileUrl}
      alt={fileName}
      className="max-w-full h-auto rounded-lg select-none"
      style={{ maxHeight: '300px' }}
    />
  );
};

export default ImageMessage;