import { useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { Move, Scaling } from 'lucide-react';
import { LINE_HEIGHT, roundCoordinate, textLines } from './model';

const MIN_TEXT_SIZE = 0.025;
const MAX_TEXT_SIZE = 0.2;
const HANDLE = 24;

interface TextTransformFrameProps {
  x: number;
  y: number;
  value: string;
  size: number;
  box: { width: number; height: number };
  zoom: number;
  moveLabel: string;
  resizeLabel: string;
  onMove: (x: number, y: number) => void;
  onResize: (size: number) => void;
  onGrab: () => void;
}

interface Gesture {
  id: number;
  kind: 'move' | 'resize';
  clientX: number;
  clientY: number;
  x: number;
  y: number;
  size: number;
  span: number;
  moved: boolean;
}

export function TextTransformFrame({ x, y, value, size, box, zoom, moveLabel, resizeLabel, onMove, onResize, onGrab }: TextTransformFrameProps) {
  const gesture = useRef<Gesture | null>(null);
  const lines = textLines(value);
  const fontSize = size * box.height;
  const width = (Math.max(1, ...lines.map((line) => [...line].length)) * 0.62 + 0.6) * fontSize;
  const height = lines.length * LINE_HEIGHT * fontSize;
  const handle = HANDLE / zoom;

  const start = (kind: Gesture['kind']) => (event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { return; }
    gesture.current = { id: event.pointerId, kind, clientX: event.clientX, clientY: event.clientY, x, y, size, span: width + height, moved: false };
  };

  const move = (event: ReactPointerEvent<HTMLElement>) => {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    event.stopPropagation();
    const dx = (event.clientX - current.clientX) / zoom;
    const dy = (event.clientY - current.clientY) / zoom;
    if (!current.moved && Math.hypot(dx, dy) * zoom < 4) return;
    if (!current.moved) onGrab();
    current.moved = true;
    if (current.kind === 'move') {
      onMove(roundCoordinate(current.x + dx / box.width), roundCoordinate(current.y + dy / box.height));
      return;
    }
    const factor = Math.max(0.1, 1 + (dx + dy) / Math.max(1, current.span));
    onResize(Math.min(MAX_TEXT_SIZE, Math.max(MIN_TEXT_SIZE, current.size * factor)));
  };

  const end = (event: ReactPointerEvent<HTMLElement>) => {
    const current = gesture.current;
    if (current?.id !== event.pointerId) return;
    event.stopPropagation();
    gesture.current = null;
  };

  const handleClass = 'pointer-events-auto absolute grid place-items-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-black/30 touch-none';
  const handleProps = { onPointerMove: move, onPointerUp: end, onPointerCancel: end, onClick: (event: ReactMouseEvent) => event.stopPropagation() };

  return (
    <div data-testid="drawing-text-frame" className="pointer-events-none absolute rounded-md border-dashed border-white/80"
      style={{
        left: x * box.width - 4 / zoom, top: y * box.height - 4 / zoom, width: width + 8 / zoom, height: height + 8 / zoom,
        borderWidth: 1.5 / zoom, boxShadow: `0 0 0 ${1 / zoom}px rgba(0,0,0,0.35)`,
      }}>
      <button type="button" aria-label={moveLabel} title={moveLabel} onPointerDown={start('move')} {...handleProps}
        className={`${handleClass} cursor-move`} style={{ width: handle, height: handle, left: -handle * 0.85, top: -handle * 0.85 }}>
        <Move style={{ width: handle * 0.55, height: handle * 0.55 }} />
      </button>
      <button type="button" aria-label={resizeLabel} title={resizeLabel} onPointerDown={start('resize')} {...handleProps}
        className={`${handleClass} cursor-nwse-resize`} style={{ width: handle, height: handle, right: -handle * 0.85, bottom: -handle * 0.85 }}>
        <Scaling style={{ width: handle * 0.55, height: handle * 0.55 }} />
      </button>
    </div>
  );
}
