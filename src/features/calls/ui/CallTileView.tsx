import React from 'react';
import { MonitorUp, Pin } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { EmojiText } from '@/shared/ui/CustomEmoji';
import { cn } from '@/shared/lib/utils';
import { hasLiveVideo, type CallTile } from '../model/videoLayout';
import { pinTile } from '../model/videoStore';
import VideoView from './VideoView';
import { useTileName, useUserAvatar } from './callHooks';

type TileSize = 'stage' | 'grid' | 'strip';

interface CallTileViewProps {
  tile: CallTile;
  pinned: boolean;
  size: TileSize;
}

const CallTileView: React.FC<CallTileViewProps> = ({ tile, pinned, size }) => {
  const { translations } = useLanguage();
  const avatar = useUserAvatar(tile.userId);
  const { person, name } = useTileName(tile);
  const label = (pinned ? translations.callUnpin : translations.callPin).replace('{name}', name);
  return (
    <button type="button" aria-pressed={pinned} aria-label={label} title={label} onClick={() => pinTile(tile.id)}
      data-tile={tile.kind} data-speaking={tile.speaking || undefined}
      className={cn(
        'relative flex h-full min-h-0 w-full min-w-0 items-center justify-center overflow-hidden bg-muted',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        size === 'strip' ? 'rounded-xl' : 'rounded-2xl',
      )}>
      {hasLiveVideo(tile) && tile.feed ? (
        <VideoView feed={tile.feed} fit={tile.kind === 'screen' || size === 'stage' ? 'contain' : 'cover'} />
      ) : (
        <AuthenticatedImage src={avatar} initialsFrom={person} alt="" draggable={false}
          className={cn('shrink-0 rounded-full object-cover', size === 'strip' ? 'h-10 w-10' : 'h-20 w-20 sm:h-24 sm:w-24')} />
      )}
      {tile.speaking && (
        <span aria-hidden="true" className={cn('pointer-events-none absolute inset-0 ring-[3px] ring-inset ring-success', size === 'strip' ? 'rounded-xl' : 'rounded-2xl')} />
      )}
      <span aria-hidden="true"
        className="pointer-events-none absolute bottom-1.5 left-1.5 flex max-w-[calc(100%-0.75rem)] items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
        {tile.kind === 'screen' && <MonitorUp className="h-3 w-3 shrink-0" />}
        {pinned && <Pin className="h-3 w-3 shrink-0" />}
        <span className="truncate"><EmojiText text={name} /></span>
      </span>
    </button>
  );
};

export default CallTileView;
