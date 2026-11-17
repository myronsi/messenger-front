import { forwardRef, type HTMLAttributes } from 'react';
import { Mic, Music } from 'lucide-react';
import type { AudioTrack } from '@/entities/message';
import { cn } from '@/shared/lib/utils';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';

interface TrackCoverProps extends HTMLAttributes<HTMLSpanElement> {
  track: AudioTrack;
  iconClassName?: string;
}

export const TrackCover = forwardRef<HTMLSpanElement, TrackCoverProps>(({ track, className, iconClassName, ...rest }, ref) => {
  const Icon = track.kind === 'voice' ? Mic : Music;
  return (
    <span ref={ref} {...rest}
      className={cn('flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-primary to-primary/50 text-primary-foreground', className)}>
      {track.cover
        ? <AuthenticatedImage src={track.cover} alt="" className="h-full w-full object-cover" />
        : <Icon className={cn('h-4 w-4', iconClassName)} aria-hidden="true" />}
    </span>
  );
});

TrackCover.displayName = 'TrackCover';
