import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

export const ProgressRing = ({ progress, size, stroke, label, className, trackClassName, children }: {
  progress: number; size: number; stroke: number; label: string; className?: string; trackClassName?: string; children: ReactNode;
}) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));
  return <div role="img" aria-label={label} className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="absolute inset-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className={cn('stroke-slate-200', trackClassName)} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={circumference * (1 - clamped)}
        className={cn('motion-safe:transition-[stroke-dashoffset] motion-safe:duration-1000 motion-safe:ease-linear', className)} />
    </svg>
    <div aria-hidden="true" className="relative flex flex-col items-center">{children}</div>
  </div>;
};
