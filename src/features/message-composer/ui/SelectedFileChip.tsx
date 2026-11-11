import React, { useEffect, useState } from 'react';
import { File as FileIcon, FileVideo, X } from 'lucide-react';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { formatFileSize } from '@/shared/lib/formatFileSize';

interface SelectedFileChipProps {
  file: File;
  removeLabel: string;
  onRemove: () => void;
}

const SelectedFileChip: React.FC<SelectedFileChipProps> = ({ file, removeLabel, onRemove }) => {
  const { translations, language } = useLanguage();
  const [previewUrl, setPreviewUrl] = useState<string>();
  useEffect(() => {
    const url = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
    setPreviewUrl(url);
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [file]);
  const Icon = file.type.startsWith('video/') ? FileVideo : FileIcon;

  return (
    <div className="motion-reply-in flex max-w-full shrink-0 justify-start">
      <div className="flex max-w-64 items-center gap-2 rounded-2xl border border-border/60 bg-background/55 px-2 py-2 backdrop-blur-2xl">
        {previewUrl ? (
          <AuthenticatedImage src={previewUrl} alt={file.name} className="h-11 w-11 rounded-xl object-cover" />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{file.name}</div>
          <div className="text-xs text-muted-foreground">{formatFileSize(file.size, language, translations)}</div>
        </div>
        <button type="button" onClick={onRemove} aria-label={removeLabel} className="motion-press shrink-0 rounded-full p-1 transition-colors hover:bg-accent">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default SelectedFileChip;
