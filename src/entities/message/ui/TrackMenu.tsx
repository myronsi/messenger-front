import type { ReactNode } from 'react';
import { ListEnd, ListMusic, ListPlus, MoreHorizontal } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { cn } from '@/shared/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import type { AudioTrack } from '../model/audioPlayer';
import { canAddToPlaylist } from '../model/playlists';
import { queueLast, queueNext, requestAddToPlaylist } from '../model/trackActions';

interface TrackMenuProps {
  track: AudioTrack;
  className?: string;
  extra?: ReactNode;
}

export const TrackMenu = ({ track, className, extra }: TrackMenuProps) => {
  const { translations } = useLanguage();
  const t = translations.audioPlayer;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={t.more} onClick={(event) => event.stopPropagation()}
          className={cn('motion-press flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground', className)}>
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[1200]" onClick={(event) => event.stopPropagation()}>
        <DropdownMenuItem onSelect={() => queueNext(track, t.playingNext)}><ListPlus className="mr-2 h-4 w-4" />{t.playNext}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => queueLast(track, t.addedToQueue)}><ListEnd className="mr-2 h-4 w-4" />{t.addToQueue}</DropdownMenuItem>
        {canAddToPlaylist(track) && (
          <DropdownMenuItem onSelect={() => requestAddToPlaylist(track)}><ListMusic className="mr-2 h-4 w-4" />{t.addToPlaylist}</DropdownMenuItem>
        )}
        {extra && <><DropdownMenuSeparator />{extra}</>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
