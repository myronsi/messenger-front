import React from 'react';
import { File as FileIcon, X } from 'lucide-react';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';

interface SelectedFileChipProps {
  file: File;
  previewUrl: string | null;
  removeLabel: string;
  onRemove: () => void;
}

const SelectedFileChip: React.FC<SelectedFileChipProps> = ({ file, previewUrl, removeLabel, onRemove }) => (
  <div className="motion-reply-in flex justify-start">
    <div className="flex max-w-[min(100%,24rem)] items-center gap-2 rounded-2xl border border-border/60 bg-background/55 px-2 py-2 shadow-lg shadow-foreground/10 backdrop-blur-2xl">
      {previewUrl ? (
        <AuthenticatedImage src={previewUrl} alt={file.name} className="h-11 w-11 rounded-xl object-cover" />
      ) : (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent">
          <FileIcon className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{file.name}</div>
        <div className="text-xs text-muted-foreground">{Math.ceil(file.size / 1024)} KB</div>
      </div>
      <button type="button" onClick={onRemove} aria-label={removeLabel} className="motion-press shrink-0 rounded-full p-1 transition-colors hover:bg-accent">
        <X className="h-4 w-4" />
      </button>
    </div>
  </div>
);

export default SelectedFileChip;
