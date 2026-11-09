import { Pause, Play } from 'lucide-react';

const sizes = {
  sm: 'size-8 [&>svg]:size-3.5',
  md: 'size-12 [&>svg]:size-5',
  lg: 'size-[72px] [&>svg]:size-7',
};

interface VideoPlayBadgeProps {
  size?: keyof typeof sizes;
  icon?: 'play' | 'pause';
  className?: string;
}

export function VideoPlayBadge({ size = 'md', icon = 'play', className = '' }: VideoPlayBadgeProps) {
  return (
    <span aria-hidden="true"
      className={`pointer-events-none grid place-items-center rounded-full bg-black/45 text-white shadow-lg backdrop-blur-md ${sizes[size]} ${className}`}>
      {icon === 'pause'
        ? <Pause fill="currentColor" strokeWidth={2.5} strokeLinejoin="round" />
        : <Play className="ml-[10%]" fill="currentColor" strokeWidth={2.5} strokeLinejoin="round" />}
    </span>
  );
}
