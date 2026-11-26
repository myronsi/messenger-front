import React from 'react';
import { MonitorUp } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { EmojiText } from '@/shared/ui/CustomEmoji';
import { cn } from '@/shared/lib/utils';
import { stageColumns, type CallLayout, type CallTile } from '../model/videoLayout';
import { chooseShare } from '../model/videoStore';
import CallTileView from './CallTileView';
import { useTileName } from './callHooks';
import { useNarrowScreen } from './videoHooks';

type VideoLayout = Exclude<CallLayout, { mode: 'audio' }>;

interface VideoStageProps {
  layout: VideoLayout;
  pinned: string | null;
}

const ShareChoice: React.FC<{ tile: CallTile; active: boolean }> = ({ tile, active }) => {
  const { name } = useTileName(tile);
  return (
    <button type="button" role="radio" aria-checked={active} onClick={() => chooseShare(tile.id)}
      className={cn(
        'flex max-w-[12rem] shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-accent',
      )}>
      <MonitorUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate"><EmojiText text={name} /></span>
    </button>
  );
};

const VideoStage: React.FC<VideoStageProps> = ({ layout, pinned }) => {
  const { translations } = useLanguage();
  const narrow = useNarrowScreen();

  if (layout.mode === 'grid') {
    const columns = stageColumns(layout.tiles.length, layout.columns, narrow);
    const rows = Math.ceil(layout.tiles.length / columns);
    return (
      <div data-call-layout="grid" className="grid min-h-0 flex-1 gap-2 px-3 py-2"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}>
        {layout.tiles.map((tile) => <CallTileView key={tile.id} tile={tile} pinned={false} size="grid" />)}
      </div>
    );
  }

  return (
    <div data-call-layout="stage" className="flex min-h-0 flex-1 flex-col gap-2 px-3 py-2">
      {layout.shares.length > 1 && (
        <div role="radiogroup" aria-label={translations.callSharedScreens} className="flex shrink-0 gap-2 overflow-x-auto pb-0.5">
          {layout.shares.map((tile) => <ShareChoice key={tile.id} tile={tile} active={tile.id === layout.main.id} />)}
        </div>
      )}
      <div className="min-h-0 flex-1">
        <CallTileView tile={layout.main} pinned={pinned === layout.main.id} size="stage" />
      </div>
      {layout.strip.length > 0 && (
        <ul className="flex shrink-0 gap-2 overflow-x-auto pb-0.5">
          {layout.strip.map((tile) => (
            <li key={tile.id} className="h-20 w-28 shrink-0 sm:h-24 sm:w-36">
              <CallTileView tile={tile} pinned={pinned === tile.id} size="strip" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default VideoStage;
