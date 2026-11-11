import { useEffect, useRef, useState } from 'react';
import { Eraser, Hand, Pencil, Type } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { DRAWING_COLORS } from './model';
import type { DrawingTool } from './useDrawingPointer';

const toolClass = (active: boolean) => `motion-press grid size-10 place-items-center rounded-full transition-colors ${active ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-white hover:bg-white/20'}`;
const MAX_PREVIEW = 36;

interface DrawingToolbarProps {
  hint?: string;
  tool: DrawingTool;
  color: string;
  sizeLevel: number;
  previewSize: number;
  onTool: (tool: DrawingTool) => void;
  onColor: (color: string) => void;
  onSizeLevel: (level: number) => void;
}

interface SwatchesProps {
  color: string;
  label: string;
  className: string;
  onColor: (color: string) => void;
}

const Swatches = ({ color, label, className, onColor }: SwatchesProps) => (
  <div role="radiogroup" aria-label={label} className={className}>
    {DRAWING_COLORS.map((value, index) => (
      <button key={value} type="button" role="radio" aria-checked={color === value} aria-label={`${label} ${index + 1}`}
        onClick={() => onColor(value)}
        className={`motion-press size-7 shrink-0 rounded-full ring-offset-2 ring-offset-black transition-shadow ${color === value ? 'ring-2 ring-white' : 'ring-1 ring-white/40'}`}
        style={{ backgroundColor: value }} />
    ))}
  </div>
);

type Panel = 'color' | 'size' | null;

const popover = 'max-sm:absolute max-sm:bottom-full max-sm:left-1/2 max-sm:z-10 max-sm:-translate-x-1/2 max-sm:rounded-full max-sm:bg-black max-sm:shadow-lg max-sm:ring-1 max-sm:ring-white/15';
const panelClass = (open: boolean, mobile: string) => `${open ? `flex ${popover} ${mobile}` : 'hidden'} sm:flex`;

export function DrawingToolbar({ hint, tool, color, sizeLevel, previewSize, onTool, onColor, onSizeLevel }: DrawingToolbarProps) {
  const { translations: t } = useLanguage();
  const [panel, setPanel] = useState<Panel>(null);
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!panel) return;
    const close = (event: PointerEvent) => { if (!barRef.current?.contains(event.target as Node)) setPanel(null); };
    window.addEventListener('pointerdown', close, true);
    return () => window.removeEventListener('pointerdown', close, true);
  }, [panel]);
  const tools = [
    { id: 'pen' as const, label: t.drawingPen, Icon: Pencil },
    { id: 'text' as const, label: t.drawingText, Icon: Type },
    { id: 'eraser' as const, label: t.drawingEraser, Icon: Eraser },
    { id: 'pan' as const, label: t.drawingMove, Icon: Hand },
  ];
  const paints = tool === 'pen' || tool === 'text';
  const dot = Math.max(2, Math.min(MAX_PREVIEW, previewSize));
  const toggle = (next: Exclude<Panel, null>) => setPanel((current) => (current === next ? null : next));
  const mobileButton = 'motion-press grid size-10 place-items-center rounded-full bg-white/10 sm:hidden';
  return (
    <div ref={barRef} className="relative flex flex-wrap items-center justify-center gap-x-4 gap-y-3 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
      {hint && !panel && <p className="w-full text-center text-sm text-white/60">{hint}</p>}
      <div role="radiogroup" aria-label={t.drawingTools} className="flex gap-2">
        {tools.map(({ id, label, Icon }) => (
          <button key={id} type="button" role="radio" aria-checked={tool === id} aria-label={label} title={label}
            onClick={() => { setPanel(null); onTool(id); }} className={toolClass(tool === id)}>
            <Icon className="size-5" />
          </button>
        ))}
        {paints && (
          <button type="button" data-testid="drawing-color-button" aria-label={t.drawingColor} title={t.drawingColor} aria-expanded={panel === 'color'}
            onClick={() => toggle('color')} className={mobileButton}>
            <span className="size-6 rounded-full ring-2 ring-white" style={{ backgroundColor: color }} />
          </button>
        )}
        {paints && (
          <button type="button" data-testid="drawing-size-button" aria-label={t.drawingSize} title={t.drawingSize} aria-expanded={panel === 'size'}
            onClick={() => toggle('size')} className={mobileButton}>
            <span className="rounded-full" style={{ width: Math.min(24, dot), height: Math.min(24, dot), backgroundColor: color }} />
          </button>
        )}
      </div>
      {paints && (
        <Swatches color={color} label={t.drawingColor} onColor={(value) => { onColor(value); setPanel(null); }}
          className={`${panelClass(panel === 'color', 'gap-2 p-2.5')} gap-1.5`} />
      )}
      {paints && (
        <div className={`${panelClass(panel === 'size', 'w-64 px-4 py-2')} items-center gap-3`}>
          <input type="range" min={0} max={1} step={0.01} value={sizeLevel} aria-label={t.drawingSize} title={t.drawingSize}
            onChange={(event) => onSizeLevel(Number(event.target.value))} className="h-1 w-32 cursor-pointer accent-primary max-sm:flex-1" />
          <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center">
            <span data-testid="drawing-size-preview" className="rounded-full" style={{ width: dot, height: dot, backgroundColor: color }} />
          </span>
        </div>
      )}
    </div>
  );
}
