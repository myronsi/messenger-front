import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Loader2, Redo2, Trash2, Undo2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { BackToClose } from '@/shared/ui/BackToClose';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { DrawingItems } from './DrawingOverlay';
import { DrawingToolbar } from './DrawingToolbar';
import { InlineTextEditor } from './InlineTextEditor';
import { TextTransformFrame } from './TextTransformFrame';
import { useTextGrab } from './useTextGrab';
import { DEFAULT_SIZE_LEVEL, DRAWING_COLORS, hitsItem, MAX_DRAWING_ITEMS, roundCoordinate, strokeWidthAt, textSizeAt, toDrawing, type Drawing } from './model';
import { useDrawingHistory } from './useDrawingHistory';
import { useDrawingPointer, type DrawingTool } from './useDrawingPointer';
import { MAX_ZOOM, useEditorZoom } from './useEditorZoom';

const VIEW_WIDTH = 1000;
const STAGE_PADDING = 24;
const zoomButton = 'max-sm:hidden';
const iconButton = 'motion-press grid size-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-40';

export interface DrawingEditorProps {
  src: string;
  name: string;
  initial?: Drawing | null;
  aspect?: number;
  confirmLabel: string;
  requireItems?: boolean;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (drawing: Drawing | null, aspect: number) => void;
}

interface TextDraft {
  x: number;
  y: number;
  value: string;
  index: number | null;
}

function useFitBox(aspect: number | undefined) {
  const [stage, setStageNode] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!stage) return;
    const measure = () => setSize({ width: stage.clientWidth - STAGE_PADDING, height: stage.clientHeight - STAGE_PADDING });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [stage]);
  if (!aspect || size.width <= 0 || size.height <= 0) return { stage, setStageNode, box: null };
  const width = Math.min(size.width, size.height * aspect);
  return { stage, setStageNode, box: { width, height: width / aspect } };
}

const levelOfTextSize = (size = 0.05) => Math.min(1, Math.max(0, Math.log(size / 0.025) / Math.log(8)));

export function DrawingEditor({
  src, name, initial, aspect: knownAspect, confirmLabel, requireItems = false, busy = false, error, onCancel, onConfirm,
}: DrawingEditorProps) {
  const { translations: t } = useLanguage();
  const [aspect, setAspect] = useState(knownAspect);
  const [tool, setTool] = useState<DrawingTool>('pen');
  const [color, setColor] = useState<string>(DRAWING_COLORS[2]);
  const [sizeLevel, setSizeLevel] = useState(DEFAULT_SIZE_LEVEL);
  const [textDraft, setTextDraft] = useState<TextDraft | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const { items, commit, undo, redo, canUndo, canRedo } = useDrawingHistory(initial?.items);
  const surfaceRef = useRef<SVGSVGElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const grabOrigin = useRef({ x: 0, y: 0 });
  const textDraftRef = useRef(textDraft);
  textDraftRef.current = textDraft;
  const { stage, setStageNode, box } = useFitBox(aspect);
  const cancelStrokeRef = useRef<() => void>(() => {});
  const zoom = useEditorZoom(stage, box, tool === 'pan', () => cancelStrokeRef.current());

  const commitText = () => {
    const draft = textDraftRef.current;
    if (!draft) return items;
    textDraftRef.current = null;
    setTextDraft(null);
    const value = draft.value.trim();
    const item = { type: 'text' as const, color, x: draft.x, y: draft.y, size: textSizeAt(sizeLevel), text: value };
    let next = items;
    if (draft.index !== null) {
      next = value ? items.map((current, index) => (index === draft.index ? item : current)) : items.filter((_, index) => index !== draft.index);
    } else if (value && items.length < MAX_DRAWING_ITEMS) next = [...items, item];
    else if (value) setLimitReached(true);
    if (next !== items) commit(next);
    return next;
  };

  const placeText = (x: number, y: number) => {
    const editing = !!textDraftRef.current;
    const current = commitText();
    let index = -1;
    current.forEach((item, position) => { if (item.type === 'text' && hitsItem(item, x, y, aspect ?? 1, 0.005)) index = position; });
    const existing = index >= 0 ? current[index] : null;
    if (existing) {
      setColor(existing.color);
      setSizeLevel(levelOfTextSize(existing.size));
      grabOrigin.current = { x: existing.x ?? x, y: existing.y ?? y };
      setTextDraft({ ...grabOrigin.current, value: existing.text ?? '', index });
      return true;
    }
    if (!editing) setTextDraft({ x, y, value: '', index: null });
    return false;
  };

  const dragText = (dx: number, dy: number) => setTextDraft((current) => (current
    ? { ...current, x: roundCoordinate(grabOrigin.current.x + dx), y: roundCoordinate(grabOrigin.current.y + dy) } : current));
  const moveText = (x: number, y: number) => setTextDraft((current) => (current ? { ...current, x, y } : current));
  const grab = useTextGrab({
    x: textDraft?.x ?? 0, y: textDraft?.y ?? 0, box: box ?? { width: 1, height: 1 }, zoom: zoom.view.scale,
    onMove: moveText, onGrab: () => fieldRef.current?.blur(),
  });

  const { visibleItems, draft, handlers, cancel } = useDrawingPointer({
    surfaceRef, tool, color, width: strokeWidthAt(sizeLevel), aspect: aspect ?? 1, zoom: zoom.view.scale, items, commit,
    onPlaceText: placeText, onDragText: dragText, onLimit: () => setLimitReached(true), isGesturing: zoom.isGesturing,
  });
  cancelStrokeRef.current = cancel;
  useEffect(() => setLimitReached(false), [items]);
  const viewHeight = VIEW_WIDTH / (aspect ?? 1);
  const edited = canUndo || !!textDraft?.value.trim();
  const canConfirm = !busy && !!aspect && (!requireItems || items.length > 0 || !!textDraft?.value.trim());
  const typing = textDraft?.value ? [{ type: 'text' as const, color, x: textDraft.x, y: textDraft.y, size: textSizeAt(sizeLevel), text: textDraft.value }] : [];
  const shown = [...visibleItems.filter((_, index) => index !== textDraft?.index), ...(draft ? [draft] : []), ...typing];
  const previewSize = (tool === 'text' ? textSizeAt(sizeLevel) * (box?.height ?? 0) : strokeWidthAt(sizeLevel) * (box?.width ?? 0)) * zoom.view.scale;

  const confirm = () => {
    const next = commitText();
    if (aspect) onConfirm(toDrawing(next), aspect);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) return;
    const key = event.key.toLowerCase();
    if (event.ctrlKey || event.metaKey) {
      if (key === 'z' && !event.shiftKey) undo();
      else if (key === 'y' || (key === 'z' && event.shiftKey)) redo();
      else return;
    } else if (key === '+' || key === '=') zoom.zoomBy(1.25);
    else if (key === '-') zoom.zoomBy(0.8);
    else if (key === '0') zoom.reset();
    else return;
    event.preventDefault();
  };

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => { if (!open && !busy) onCancel(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content aria-describedby={undefined} onKeyDown={onKeyDown}
          onEscapeKeyDown={(event) => { if (textDraftRef.current) { event.preventDefault(); setTextDraft(null); } }}
          onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}
          className="fixed inset-0 z-[10001] flex flex-col bg-black text-white outline-none">
          <BackToClose onClose={() => { if (!busy) onCancel(); }} flag="drawingEditor" />
          <DialogPrimitive.Title className="sr-only">{t.drawingTitle}</DialogPrimitive.Title>
          <div className="flex items-center gap-2 px-3 pb-2 pt-[calc(0.75rem+env(safe-area-inset-top))]">
            <button type="button" onClick={onCancel} disabled={busy} aria-label={t.cancel} title={t.cancel} className={iconButton}><X className="size-5" /></button>
            <span className="min-w-0 flex-1 truncate text-sm text-white/70 max-sm:invisible">{name}</span>
            <button type="button" onClick={() => zoom.zoomBy(0.8)} disabled={zoom.view.scale <= 1} aria-label={t.zoomOut} title={t.zoomOut} className={`${zoomButton} ${iconButton}`}>
              <ZoomOut className="size-5" />
            </button>
            <button type="button" onClick={() => zoom.zoomBy(1.25)} disabled={zoom.view.scale >= MAX_ZOOM} aria-label={t.zoomIn} title={t.zoomIn} className={`${zoomButton} ${iconButton}`}>
              <ZoomIn className="size-5" />
            </button>
            <button type="button" onClick={undo} disabled={!canUndo || busy} aria-label={t.drawingUndo} title={t.drawingUndo} className={iconButton}><Undo2 className="size-5" /></button>
            <button type="button" onClick={redo} disabled={!canRedo || busy} aria-label={t.drawingRedo} title={t.drawingRedo} className={iconButton}><Redo2 className="size-5" /></button>
            <button type="button" onClick={() => commit([])} disabled={!items.length || busy} aria-label={t.drawingClear} title={t.drawingClear} className={iconButton}>
              <Trash2 className="size-5" />
            </button>
            {edited && <button type="button" data-testid="drawing-confirm" disabled={!canConfirm} onPointerDown={(event) => event.preventDefault()} onClick={confirm}
              className="motion-press ml-1 flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {busy && <Loader2 className="size-4 animate-spin" />}{confirmLabel}
            </button>}
          </div>
          {(error || limitReached) && (
            <p role="alert" className="mx-auto px-4 pb-2 text-center text-sm text-destructive-foreground">{error || t.drawingLimit}</p>
          )}
          <div ref={setStageNode} data-testid="drawing-stage" className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3"
            style={{ touchAction: 'none' }} {...zoom.handlers}>
            <div className="relative shrink-0" style={box ? {
              width: box.width, height: box.height, transform: `translate(${zoom.view.x}px, ${zoom.view.y}px) scale(${zoom.view.scale})`,
            } : { visibility: 'hidden' }}>
              <AuthenticatedImage src={src} alt={name} loading="eager" draggable={false}
                className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
                onLoad={(event) => {
                  const { naturalWidth, naturalHeight } = event.currentTarget;
                  if (!knownAspect && naturalWidth && naturalHeight) setAspect(naturalWidth / naturalHeight);
                }} />
              <svg ref={surfaceRef} data-testid="drawing-surface" viewBox={`0 0 ${VIEW_WIDTH} ${viewHeight}`} preserveAspectRatio="none"
                className={`absolute inset-0 h-full w-full ${tool === 'text' ? 'cursor-text' : tool === 'pan' ? 'cursor-grab' : 'cursor-crosshair'}`}
                style={{ touchAction: 'none' }} {...handlers}>
                <DrawingItems items={shown} width={VIEW_WIDTH} height={viewHeight} />
              </svg>
              {textDraft && box && (
                <InlineTextEditor x={textDraft.x} y={textDraft.y} value={textDraft.value} color={color}
                  fontSize={textSizeAt(sizeLevel) * box.height} zoom={zoom.view.scale}
                  label={t.drawingTextPlaceholder} onChange={(value) => setTextDraft((current) => (current ? { ...current, value } : current))}
                  onCommit={commitText} onCancel={() => setTextDraft(null)} fieldRef={fieldRef} grab={textDraft.value.trim() ? grab : undefined} />
              )}
              {textDraft?.value.trim() && box && (
                <TextTransformFrame x={textDraft.x} y={textDraft.y} value={textDraft.value} size={textSizeAt(sizeLevel)} box={box} zoom={zoom.view.scale}
                  moveLabel={t.drawingTextMove} resizeLabel={t.drawingTextResize} onResize={(size) => setSizeLevel(levelOfTextSize(size))}
                  onGrab={() => fieldRef.current?.blur()}
                  onMove={moveText} />
              )}
            </div>
            {!box && <Loader2 className="absolute size-6 animate-spin text-white/50" />}
          </div>
          <DrawingToolbar hint={tool === 'text' && !textDraft ? t.drawingTextHint : undefined} tool={tool} color={color} sizeLevel={sizeLevel} previewSize={previewSize} onSizeLevel={setSizeLevel} onColor={setColor}
            onTool={(next) => { commitText(); setTool(next); }} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
