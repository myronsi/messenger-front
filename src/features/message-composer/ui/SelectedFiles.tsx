import { useEffect, useState } from 'react';
import { Brush, Plus, X } from 'lucide-react';
import { VideoPlayBadge } from '@/shared/ui/VideoPlayBadge';
import { isAlbumFile } from '@/shared/lib/uploadValidation';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { DrawingEditor, DrawingOverlay } from '@/shared/ui/drawing';
import type { FileDrawing, FileDrawings } from '../model/useFileDrawings';
import SelectedFileChip from './SelectedFileChip';

const isVideoFile = (file: File) => file.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(file.name);

function useObjectUrl(file: File) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url;
}

interface FileDrawingEditorProps {
  file: File;
  value?: FileDrawing;
  onDone: (value: FileDrawing | null) => void;
  onCancel: () => void;
}

function FileDrawingEditor({ file, value, onDone, onCancel }: FileDrawingEditorProps) {
  const { translations: t } = useLanguage();
  const url = useObjectUrl(file);
  if (!url) return null;
  return (
    <DrawingEditor src={url} name={file.name} initial={value?.drawing} aspect={value?.aspect} confirmLabel={t.drawingDone} onCancel={onCancel}
      onConfirm={(drawing, aspect) => onDone(drawing ? { drawing, aspect } : null)} />
  );
}

interface SelectedMediaTileProps {
  file: File;
  removeLabel: string;
  drawing?: FileDrawing;
  onRemove: () => void;
  onDraw?: () => void;
}

function SelectedMediaTile({ file, removeLabel, drawing, onRemove, onDraw }: SelectedMediaTileProps) {
  const { translations: t } = useLanguage();
  const url = useObjectUrl(file);
  const isVideo = isVideoFile(file);
  return (
    <div className="motion-reply-in group relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted shadow-md ring-1 ring-border/60" title={file.name}>
      {url && (isVideo
        ? <video src={`${url}#t=0.1`} muted playsInline preload="metadata" aria-hidden="true" tabIndex={-1} className="h-full w-full object-cover" />
        : <img src={url} alt={file.name} className="h-full w-full object-cover" draggable={false} />)}
      {isVideo && <VideoPlayBadge size="sm" className="absolute inset-0 m-auto scale-75" />}
      {drawing && <DrawingOverlay drawing={drawing.drawing} aspect={drawing.aspect} />}
      {onDraw && !isVideo && (
        <button type="button" onClick={onDraw} aria-label={`${drawing ? t.drawingEdit : t.drawOnImage} ${file.name}`} title={t.drawOnImage}
          className={`motion-press absolute bottom-1 left-1 grid size-6 place-items-center rounded-full text-white backdrop-blur-sm transition-colors ${drawing ? 'bg-primary' : 'bg-black/60 hover:bg-black/80'}`}>
          <Brush className="size-3.5" />
        </button>
      )}
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
  drawings?: FileDrawings;
  onDrawingChange?: (file: File, value: FileDrawing | null) => void;
}

function SelectedMediaStrip({ files, removeLabel, addLabel, canAdd, onAdd, onRemove, drawings, onDrawingChange }: SelectedMediaStripProps) {
  const [editing, setEditing] = useState<File | null>(null);
  return (
    <div data-testid="selected-media" className="flex gap-2 overflow-x-auto rounded-2xl border border-border/60 bg-background/55 p-2 shadow-lg shadow-foreground/10 backdrop-blur-2xl">
      {files.map((file, index) => (
        <SelectedMediaTile key={`${file.name}-${file.size}-${file.lastModified}-${index}`} file={file} removeLabel={removeLabel}
          drawing={drawings?.get(file)} onRemove={() => onRemove(index)} onDraw={onDrawingChange && (() => setEditing(file))} />
      ))}
      {editing && onDrawingChange && (
        <FileDrawingEditor file={editing} value={drawings?.get(editing)} onCancel={() => setEditing(null)}
          onDone={(value) => { onDrawingChange(editing, value); setEditing(null); }} />
      )}
      {canAdd && <AddTile label={addLabel} onAdd={onAdd} className="size-16" />}
    </div>
  );
}

interface AddTileProps {
  label: string;
  onAdd: () => void;
  className: string;
}

function AddTile({ label, onAdd, className }: AddTileProps) {
  return (
    <button type="button" onClick={onAdd} aria-label={label} title={label}
      className={`motion-press grid shrink-0 place-items-center rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground ${className}`}>
      <Plus className="size-5" />
    </button>
  );
}

const GroupLabel = ({ text }: { text: string }) => <div className="px-2 text-xs font-medium text-muted-foreground">{text}</div>;

export default function SelectedFiles(props: SelectedMediaStripProps) {
  const { translations: t } = useLanguage();
  const indexed = props.files.map((file, index) => ({ file, index }));
  const media = indexed.filter(({ file }) => isAlbumFile(file));
  const others = indexed.filter(({ file }) => !isAlbumFile(file));
  const grouped = media.length > 0 && others.length > 0;
  return (
    <div data-testid="selected-files" className="flex flex-col gap-1.5">
      {grouped && media.length > 1 && <GroupLabel text={fillTemplate(t.selectedAlbumGroup, { count: String(media.length) })} />}
      {media.length > 0 && (
        <SelectedMediaStrip {...props} files={media.map(({ file }) => file)} onRemove={(index) => props.onRemove(media[index].index)} />
      )}
      {grouped && <GroupLabel text={fillTemplate(t.selectedSeparateFiles, { count: String(others.length) })} />}
      {others.length > 0 && (
        <div data-testid="selected-separate-files" className="flex items-center gap-2 overflow-x-auto">
          {others.map(({ file, index }) => (
            <SelectedFileChip key={`${file.name}-${file.size}-${file.lastModified}-${index}`} file={file} removeLabel={props.removeLabel}
              onRemove={() => props.onRemove(index)} />
          ))}
          {!media.length && props.canAdd && <AddTile label={props.addLabel} onAdd={props.onAdd} className="size-[3.75rem]" />}
        </div>
      )}
    </div>
  );
}
