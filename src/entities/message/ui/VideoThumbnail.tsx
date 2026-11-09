import { useEffect, useRef, useState } from 'react';
import { Film, Play } from 'lucide-react';
import { useAuthenticatedMedia } from '@/shared/api/useAuthenticatedMedia';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { useLanguage } from '@/shared/contexts/LanguageContext';

export interface VideoPreview {
  url: string;
  name: string;
  poster?: string;
}

export default function VideoThumbnail({ url, name, poster, className = '', onOpen }: VideoPreview & {
  className?: string;
  onOpen: () => void;
}) {
  const { translations: t } = useLanguage();
  const tile = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [frame, setFrame] = useState<string>();
  const [frameFailed, setFrameFailed] = useState(false);
  const serverPoster = !posterFailed ? poster : undefined;
  const needsFrame = visible && !serverPoster && !frame && !frameFailed;
  const src = useAuthenticatedMedia(url, undefined, needsFrame, () => setFrameFailed(true));

  useEffect(() => {
    const node = tile.current;
    if (!node) return;
    if (!window.IntersectionObserver) { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      setVisible(true);
      observer.disconnect();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <button type="button" ref={tile} title={name} aria-label={`${t.playVideo} ${name}`}
      onClick={event => { event.stopPropagation(); onOpen(); }}
      className={`group relative grid min-w-0 place-items-center overflow-hidden bg-muted focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 ${className}`}>
      <Film aria-hidden="true" className="absolute size-12 text-muted-foreground/20" />
      {(serverPoster || frame) && <AuthenticatedImage src={serverPoster || frame} alt="" loading="lazy" decoding="async"
        onError={() => setPosterFailed(true)}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />}
      {needsFrame && src && <video src={src} muted playsInline preload="auto" aria-hidden="true"
        className="pointer-events-none absolute size-px opacity-0"
        onError={() => setFrameFailed(true)}
        onLoadedData={event => {
          const video = event.currentTarget;
          const scale = Math.min(1, 480 / Math.max(video.videoWidth, video.videoHeight));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(video.videoWidth * scale);
          canvas.height = Math.round(video.videoHeight * scale);
          try {
            const context = canvas.getContext('2d');
            if (!context || !canvas.width || !canvas.height) throw new Error('No video frame');
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            setFrame(canvas.toDataURL('image/jpeg', 0.82));
          } catch {
            setFrameFailed(true);
          }
        }} />}
      <span className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/25" />
      <span className="relative grid size-11 place-items-center rounded-full bg-black/50 text-white ring-1 ring-white/50 backdrop-blur-md transition-transform group-hover:scale-110">
        <Play aria-hidden="true" className="ml-0.5 size-4" fill="currentColor" />
      </span>
    </button>
  );
}
