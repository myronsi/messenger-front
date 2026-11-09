import type { CSSProperties } from 'react';
import { LINE_HEIGHT, textLines, type Drawing, type DrawingItem } from './model';

const VIEW_WIDTH = 1000;

const strokePath = (points: readonly number[], width: number, height: number) => {
  if (points.length < 2) return '';
  const at = (index: number) => `${points[index] * width} ${points[index + 1] * height}`;
  let path = `M ${at(0)} L ${at(0)}`;
  for (let index = 2; index < points.length; index += 2) path += ` L ${at(index)}`;
  return path;
};

export function DrawingItems({ items, width, height }: { items: readonly DrawingItem[]; width: number; height: number }) {
  return (
    <>
      {items.map((item, index) => {
        if (item.type === 'stroke') {
          return (
            <path key={index} d={strokePath(item.points ?? [], width, height)} fill="none" stroke={item.color}
              strokeWidth={(item.width ?? 0) * width} strokeLinecap="round" strokeLinejoin="round" />
          );
        }
        const fontSize = (item.size ?? 0) * height;
        const x = (item.x ?? 0) * width;
        return (
          <text key={index} x={x} y={(item.y ?? 0) * height} fill={item.color} fontSize={fontSize} fontWeight={600}
            dominantBaseline="hanging" stroke="rgba(0,0,0,0.45)" strokeWidth={fontSize * 0.08} style={{ paintOrder: 'stroke', whiteSpace: 'pre' }}>
            {textLines(item.text).map((line, lineIndex) => (
              <tspan key={lineIndex} x={x} dy={lineIndex === 0 ? 0 : `${LINE_HEIGHT}em`}>{line}</tspan>
            ))}
          </text>
        );
      })}
    </>
  );
}

interface DrawingOverlayProps {
  drawing?: Drawing | null;
  aspect?: number;
  fit?: 'cover' | 'contain';
  className?: string;
  style?: CSSProperties;
}

export function DrawingOverlay({ drawing, aspect, fit = 'cover', className = 'pointer-events-none absolute inset-0 h-full w-full', style }: DrawingOverlayProps) {
  if (!drawing?.items.length || !aspect || !Number.isFinite(aspect) || aspect <= 0) return null;
  const height = VIEW_WIDTH / aspect;
  return (
    <svg data-testid="drawing-overlay" aria-hidden="true" viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
      preserveAspectRatio={`xMidYMid ${fit === 'cover' ? 'slice' : 'meet'}`} className={className} style={style}>
      <DrawingItems items={drawing.items} width={VIEW_WIDTH} height={height} />
    </svg>
  );
}
