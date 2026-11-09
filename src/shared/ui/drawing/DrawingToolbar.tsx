import { Eraser, Hand, Pencil, Type } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { DRAWING_COLORS } from './model';
import type { DrawingTool } from './useDrawingPointer';

const toolClass = (active: boolean) => `motion-press grid size-10 place-items-center rounded-full transition-colors ${active ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-white hover:bg-white/20'}`;
const MAX_PREVIEW = 36;

interface DrawingToolbarProps {
  tool: DrawingTool;
  color: string;
  sizeLevel: number;
  previewSize: number;
  onTool: (tool: DrawingTool) => void;
  onColor: (color: string) => void;
  onSizeLevel: (level: number) => void;
}

export function DrawingToolbar({ tool, color, sizeLevel, previewSize, onTool, onColor, onSizeLevel }: DrawingToolbarProps) {
  const { translations: t } = useLanguage();
  const tools = [
    { id: 'pen' as const, label: t.drawingPen, Icon: Pencil },
    { id: 'text' as const, label: t.drawingText, Icon: Type },
    { id: 'eraser' as const, label: t.drawingEraser, Icon: Eraser },
    { id: 'pan' as const, label: t.drawingMove, Icon: Hand },
  ];
  const paints = tool === 'pen' || tool === 'text';
  const dot = Math.max(2, Math.min(MAX_PREVIEW, previewSize));
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
      <div role="radiogroup" aria-label={t.drawingTools} className="flex gap-2">
        {tools.map(({ id, label, Icon }) => (
          <button key={id} type="button" role="radio" aria-checked={tool === id} aria-label={label} title={label}
            onClick={() => onTool(id)} className={toolClass(tool === id)}>
            <Icon className="size-5" />
          </button>
        ))}
      </div>
      {paints && (
        <div role="radiogroup" aria-label={t.drawingColor} className="flex gap-1.5">
          {DRAWING_COLORS.map((value, index) => (
            <button key={value} type="button" role="radio" aria-checked={color === value} aria-label={`${t.drawingColor} ${index + 1}`}
              onClick={() => onColor(value)}
              className={`motion-press size-7 rounded-full ring-offset-2 ring-offset-black transition-shadow ${color === value ? 'ring-2 ring-white' : 'ring-1 ring-white/40'}`}
              style={{ backgroundColor: value }} />
          ))}
        </div>
      )}
      {paints && (
        <div className="flex items-center gap-3">
          <input type="range" min={0} max={1} step={0.01} value={sizeLevel} aria-label={t.drawingSize} title={t.drawingSize}
            onChange={(event) => onSizeLevel(Number(event.target.value))} className="h-1 w-32 cursor-pointer accent-primary" />
          <span aria-hidden="true" className="grid size-9 place-items-center">
            <span data-testid="drawing-size-preview" className="rounded-full" style={{ width: dot, height: dot, backgroundColor: color }} />
          </span>
        </div>
      )}
    </div>
  );
}
