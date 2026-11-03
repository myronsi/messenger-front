import React from 'react';
import { Reply } from 'lucide-react';

interface SwipeReplyIconProps {
  side: 'left' | 'right';
  progress: number;
}

const SwipeReplyIcon: React.FC<SwipeReplyIconProps> = ({ side, progress }) => (
  <div
    aria-hidden="true"
    className={`pointer-events-none absolute top-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground ${side === 'left' ? 'left-1' : 'right-1'}`}
    style={{ opacity: progress, transform: `translateY(-50%) scale(${0.6 + 0.4 * progress})` }}
  >
    <Reply className={`h-4 w-4 ${side === 'right' ? '-scale-x-100' : ''}`} />
  </div>
);

export default SwipeReplyIcon;
