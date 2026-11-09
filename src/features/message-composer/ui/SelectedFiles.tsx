import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { VideoPlayBadge } from '@/shared/ui/VideoPlayBadge';
import { isAlbumFile } from '@/shared/lib/uploadValidation';
import SelectedFileChip from './SelectedFileChip';

const isVideoFile = (file: File) => file.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(file.name);

function SelectedMediaTile({ file, removeLabel, onRemove }: { file: File; removeLabel: string; onRemove: () => void }) {
  const [url, setUrl] = useState<string>();
  const isVideo = isVideoFile(file);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return (
    <div className="motion-reply-in group relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted shadow-md ring-1 ring-border/60" title={file.name}>
      {url && (isVideo
        ? <video src={`${url}#t=0.1`} muted playsInline preload="metadata" aria-hidden="true" className="h-full w-full object-cover" />
        : <img src={url} alt={file.name} className="h-full w-full object-cover" draggable={false} />)}
      {isVideo && <VideoPlayBadge size="sm" className="absolute inset-0 m-auto scale-75" />}
      <button type="button" onClick={onRemove} aria-label={`${removeLabel} ${file.name}`}
        className="motion-press absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80">
        <X className="size-3" strokeWidth={3} />
      </button>
    </div>
  );
}

interface SelectedMediaStripProps {
  files: File[];
  removeLabel: string;
  addLabel: string;
  canAdd: boolean;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

function SelectedMediaStrip({ files, removeLabel, addLabel, canAdd, onAdd, onRemove }: SelectedMediaStripProps) {
  return (
    <div data-testid="selected-media" className="flex gap-2 overflow-x-auto rounded-2xl border border-border/60 bg-background/55 p-2 shadow-lg shadow-foreground/10 backdrop-blur-2xl">
      {files.map((file, index) => (
        <SelectedMediaTile key={`${file.name}-${file.size}-${file.lastModified}-${index}`} file={file} removeLabel={removeLabel} onRemove={() => onRemove(index)} />
      ))}
      {canAdd && (
        <button type="button" onClick={onAdd} aria-label={addLabel} title={addLabel}
          className="motion-press grid size-16 shrink-0 place-items-center rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground">
          <Plus className="size-5" />
        </button>
      )}
    </div>
  );
}

export default function SelectedFiles(props: SelectedMediaStripProps) {
  if (props.files.every(isAlbumFile)) return <SelectedMediaStrip {...props} />;
  return (
    <div className="flex gap-2 overflow-x-auto">
      {props.files.map((file, index) => (
        <SelectedFileChip key={`${file.name}-${index}`} file={file} removeLabel={props.removeLabel} onRemove={() => props.onRemove(index)} />
      ))}
    </div>
  );
}
