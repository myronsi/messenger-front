import type React from 'react';
import { Archive, ArchiveRestore } from 'lucide-react';
import type { RowSwipePhase } from '../model/useRowSwipe';

interface SwipeArchiveBackdropProps {
  offset: number;
  progress: number;
  armed: boolean;
  phase: RowSwipePhase;
  isArchived: boolean;
  label: string;
}

const BOUNCE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

const SwipeArchiveBackdrop: React.FC<SwipeArchiveBackdropProps> = ({ offset, progress, armed, phase, isArchived, label }) => {
  const revealed = Math.max(72, -offset);
  const Icon = isArchived ? ArchiveRestore : Archive;
  const leaving = phase === 'leaving';
  return (
    <div aria-hidden="true" data-testid="chat-swipe-action" data-armed={armed || undefined}
      className={`absolute inset-0 overflow-hidden rounded-xl transition-colors duration-150 ${armed ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
      <div className="absolute inset-y-0 right-0 flex flex-col items-center justify-center gap-1"
        style={{
          width: leaving ? '100%' : revealed,
          opacity: leaving ? 1 : Math.min(1, progress * 1.6),
          transition: leaving ? `width ${180}ms ease-out` : phase === 'dragging' ? 'none' : 'opacity 200ms ease-out',
        }}>
        <span className="flex"
          style={{
            transform: `scale(${armed ? 1.15 : 0.75 + progress * 0.25}) rotate(${leaving ? (isArchived ? 10 : -10) : 0}deg)`,
            transition: `transform 260ms ${BOUNCE}`,
          }}>
          <Icon className="h-6 w-6" />
        </span>
        <span className="text-[11px] font-semibold">{label}</span>
      </div>
    </div>
  );
};

export default SwipeArchiveBackdrop;
