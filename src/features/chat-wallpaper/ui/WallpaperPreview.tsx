import { WallpaperFill } from '@/entities/chat-wallpaper';
import type { ThemeTone } from '@/shared/lib/appearance/palette';
import type { ChatWallpaper } from '@/shared/lib/appearance/wallpaper';
import { cn } from '@/shared/lib/utils';

interface WallpaperPreviewProps {
  wallpaper: ChatWallpaper;
  tone: ThemeTone;
  label: string;
  incoming: string;
  outgoing: string;
  className?: string;
}

export const WallpaperPreview = ({ wallpaper, tone, label, incoming, outgoing, className }: WallpaperPreviewProps) => (
  <figure aria-label={label} data-testid="appearance-preview"
    className={cn('relative isolate flex flex-col gap-[var(--chat-gap)] overflow-hidden rounded-lg border border-border px-5 py-4', className)}>
    <WallpaperFill wallpaper={wallpaper} tone={tone} className="absolute inset-0 -z-10" />
    <div className="flex justify-start">
      <div className="bubble-in message-tail-left max-w-[80%] rounded-bubble bg-accent px-3 py-1.5 text-accent-foreground">
        <div data-message-text-body>{incoming}</div>
        <div className="text-right text-[10px] text-muted-foreground">12:41</div>
      </div>
    </div>
    <div className="flex justify-end">
      <div className="bubble-out message-tail-right max-w-[80%] rounded-bubble bg-primary px-3 py-1.5 text-primary-foreground">
        <div data-message-text-body>{outgoing}</div>
        <div className="text-right text-[10px] opacity-80">12:42</div>
      </div>
    </div>
  </figure>
);
