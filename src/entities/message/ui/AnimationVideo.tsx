import { useState } from 'react';
import { usePlaybackUrl } from '@/shared/api/playbackUrl';

interface AnimationVideoProps {
  url: string;
  label: string;
  className?: string;
  onClick?: (event: React.MouseEvent) => void;
}

export function AnimationVideo({ url, label, className = '', onClick }: AnimationVideoProps) {
  const { src } = usePlaybackUrl(url);
  const [ready, setReady] = useState(false);
  if (!src) return null;
  return (
    <video data-testid="gif-animation" src={src} autoPlay loop muted playsInline preload="auto" aria-label={label}
      onLoadedData={() => setReady(true)} onClick={onClick}
      className={`absolute inset-0 h-full w-full cursor-pointer object-cover transition-opacity duration-150 ${ready ? 'opacity-100' : 'opacity-0'} ${className}`} />
  );
}
