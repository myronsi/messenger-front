import { useAuthenticatedMedia } from '@/shared/api/useAuthenticatedMedia';
import { cn } from '@/shared/lib/utils';
import type { ThemeTone } from '@/shared/lib/appearance/palette';
import { colorFill, patternFill, wallpaperDim, type ChatWallpaper } from '@/shared/lib/appearance/wallpaper';

type PhotoWallpaper = Extract<ChatWallpaper, { kind: 'photo' }>;

const PhotoFill = ({ wallpaper, tone }: { wallpaper: PhotoWallpaper; tone: ThemeTone }) => {
  const source = useAuthenticatedMedia(wallpaper.photo.displayUrl || wallpaper.photo.url);
  const dim = wallpaperDim(wallpaper, tone);
  return (
    <>
      {source
        ? <img data-testid="wallpaper-photo" src={source} alt="" draggable={false}
          className={cn('absolute inset-0 h-full w-full object-cover', wallpaper.blur > 0 && 'scale-110')}
          style={wallpaper.blur > 0 ? { filter: `blur(${wallpaper.blur}px)` } : undefined} />
        : <div className="absolute inset-0 bg-muted" />}
      {dim > 0 && <div data-testid="wallpaper-dim" className="absolute inset-0 bg-black" style={{ opacity: dim / 100 }} />}
    </>
  );
};

interface WallpaperFillProps {
  wallpaper: ChatWallpaper;
  tone: ThemeTone;
  className?: string;
}

export const WallpaperFill = ({ wallpaper, tone, className }: WallpaperFillProps) => {
  if (wallpaper.kind === 'builtin') {
    return <div data-testid="chat-wallpaper" data-kind="builtin" aria-hidden="true" className={cn(`chat-bg-${wallpaper.preset}`, className)} />;
  }
  if (wallpaper.kind === 'color') {
    const pattern = patternFill(wallpaper.pattern);
    return (
      <div data-testid="chat-wallpaper" data-kind="color" aria-hidden="true" className={cn('relative overflow-hidden', className)} style={colorFill(wallpaper.colors)}>
        {pattern && <div className="absolute inset-0" style={pattern} />}
      </div>
    );
  }
  return (
    <div data-testid="chat-wallpaper" data-kind="photo" aria-hidden="true" className={cn('relative overflow-hidden bg-background', className)}>
      <PhotoFill wallpaper={wallpaper} tone={tone} />
    </div>
  );
};
