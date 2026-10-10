import React, { useEffect, useState } from 'react';
import { File as FileIcon, X } from 'lucide-react';
import MediaImg from '@/shared/ui/MediaImg';

interface SelectedFilesPreviewProps {
  files: File[];
  removeLabel: string;
  onRemove: (index: number) => void;
}

const formatSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`);

// One chip per file: a thumbnail for images, the name and size, and a button to drop it.
const SelectedFileChip: React.FC<{ file: File; removeLabel: string; onRemove: () => void }> = ({ file, removeLabel, onRemove }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file.type.startsWith('image/')) return undefined;
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div className="flex max-w-[min(100%,24rem)] items-center gap-2 rounded-2xl border border-border/60 bg-background/55 px-2 py-2 shadow-lg shadow-foreground/10 backdrop-blur-2xl">
      {previewUrl ? (
        <MediaImg src={previewUrl} alt={file.name} className="h-11 w-11 rounded-xl object-cover" onError={() => setPreviewUrl(null)} />
      ) : (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent">
          <FileIcon className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{file.name}</div>
        <div className="text-xs text-muted-foreground">{formatSize(file.size)}</div>
      </div>
      <button type="button" onClick={onRemove} aria-label={removeLabel} className="motion-press shrink-0 rounded-full p-1 transition-colors hover:bg-accent">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

// The files chosen for the next message(s), above the composer.
const SelectedFilesPreview: React.FC<SelectedFilesPreviewProps> = ({ files, removeLabel, onRemove }) => (
  <div className="motion-reply-in flex max-h-48 flex-wrap justify-start gap-2 overflow-y-auto">
    {files.map((file, index) => (
      <SelectedFileChip key={`${file.name}-${file.size}-${file.lastModified}-${index}`} file={file} removeLabel={removeLabel} onRemove={() => onRemove(index)} />
    ))}
  </div>
);

export default SelectedFilesPreview;
