import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { ReactionEmoji } from '@/entities/emoji';
import { useReactionBursts } from '../model/reactionBurst';

const SPARKS = 8;

export const ReactionBurstHost = () => {
  const bursts = useReactionBursts();
  if (bursts.length === 0) return null;
  return createPortal(
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {bursts.map((burst) => (
        <div key={burst.id} data-testid="reaction-burst" className="absolute" style={{ left: burst.x, top: burst.y }}>
          {Array.from({ length: SPARKS }, (_, index) => (
            <span key={index} className={`reaction-burst-spark ${index % 2 ? 'bg-primary' : 'bg-destructive'}`}
              style={{ '--angle': `${(360 / SPARKS) * index + 22}deg` } as CSSProperties} />
          ))}
          <span className="reaction-burst-ring" />
          <span className="reaction-burst-emoji"><ReactionEmoji reaction={burst.reaction} /></span>
        </div>
      ))}
    </div>,
    document.body,
  );
};
