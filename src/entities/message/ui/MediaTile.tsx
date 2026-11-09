import { useCallback, useState, type CSSProperties } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useMediaPreload } from '@/shared/api/useMediaPreload';
import { VideoPlayBadge } from '@/shared/ui/VideoPlayBadge';
import { DrawingOverlay, type Drawing } from '@/shared/ui/drawing';
import { MediaVisual } from './MediaVisual';

interface MediaTileProps {
  url: string;
  poster?: string;
  name: string;
  isVideo: boolean;
  badge?: 'sm' | 'md';
  className?: string;
  style?: CSSProperties;
  drawing?: Drawing | null;
  aspect?: number;
  onOpen: () => void;
}

export default function MediaTile({ url, poster, name, isVideo, badge = 'md', className = '', style, drawing, aspect, onOpen }: MediaTileProps) {
  const { translations: t } = useLanguage();
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => setReady(true), []);
  const [loadedAspect, setLoadedAspect] = useState<number>();
  const preloadHandlers = useMediaPreload(isVideo ? undefined : url);
  return (
    <button
      type="button"
      title={name}
      aria-label={isVideo ? `${t.playVideo} ${name}` : name}
      {...preloadHandlers}
      onClick={(event) => { event.stopPropagation(); onOpen(); }}
      style={style}
      className={`group relative block min-h-0 min-w-0 overflow-hidden bg-muted focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring ${ready ? '' : 'animate-pulse'} ${className}`}
    >
      <MediaVisual url={url} poster={poster} isVideo={isVideo} onReady={markReady}
        onImageSize={(width, height) => { if (width && height) setLoadedAspect(width / height); }}
        className={`absolute inset-0 h-full w-full select-none object-cover transition duration-300 group-hover:scale-[1.04] ${ready ? 'opacity-100' : 'opacity-0'}`} />
      {ready && !isVideo && <DrawingOverlay drawing={drawing} aspect={aspect ?? loadedAspect}
        className="pointer-events-none absolute inset-0 h-full w-full transition duration-300 group-hover:scale-[1.04]" />}
      {isVideo && <VideoPlayBadge size={badge} className="absolute inset-0 m-auto transition-transform duration-200 group-hover:scale-110" />}
    </button>
  );
}
