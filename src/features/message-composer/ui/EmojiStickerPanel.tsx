import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { openStickerPacks, type Sticker } from '@/entities/sticker';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { EMOJI_SETS } from '@/shared/lib/emojiSets';
import { emojiMatches, normalizeSearch, searchEmoji } from '../model/emojiSearch';
import { useEmojiIndex } from '../model/useEmojiIndex';
import { StickerTab } from './StickerTab';

interface EmojiStickerPanelProps {
  onEmoji: (emoji: string) => void;
  onSticker?: (sticker: Sticker) => void;
  onDone: () => void;
  onStickersVisible?: (visible: boolean) => void;
}

const EmojiGrid = ({ emoji, onEmoji }: { emoji: string[]; onEmoji: (emoji: string) => void }) => (
  <div className="grid grid-cols-8 gap-0.5">
    {emoji.map((item) => (
      <button key={item} type="button" aria-label={item} onClick={() => onEmoji(item)}
        className="flex aspect-square items-center justify-center rounded-md text-2xl leading-none transition-colors hover:bg-accent">
        {item}
      </button>
    ))}
  </div>
);

export const EmojiStickerPanel = ({ onEmoji, onSticker, onDone, onStickersVisible }: EmojiStickerPanelProps) => {
  const { translations } = useLanguage();
  const [tab, setTab] = useState(onSticker ? 'stickers' : 'emoji');
  const showsStickers = tab === 'stickers' && !!onSticker;
  useEffect(() => {
    if (!onStickersVisible) return undefined;
    onStickersVisible(showsStickers);
    return () => onStickersVisible(false);
  }, [onStickersVisible, showsStickers]);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searching = normalizeSearch(query) !== '';
  const index = useEmojiIndex(searching);
  const results = searching && index ? searchEmoji(index, query) : null;
  const matchesSticker = (sticker: Sticker, packTitle: string) =>
    normalizeSearch(packTitle).includes(normalizeSearch(query)) || (!!index && emojiMatches(index, sticker.emoji, query));
  const stickerFilter = searching ? matchesSticker : undefined;
  const closeSearch = () => {
    setSearchOpen(false);
    setQuery('');
  };
  const empty = <p className="px-6 py-8 text-center text-sm text-muted-foreground">{translations.noSearchResults}</p>;
  return (
    <Tabs value={tab} onValueChange={setTab} className="flex h-full flex-col">
      {searchOpen && (
        <div className="mx-2 mt-2 flex shrink-0 items-center gap-2 rounded-full bg-muted pl-3 pr-1">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input type="search" autoFocus value={query} onChange={(event) => setQuery(event.target.value)} aria-label={translations.searchEmojiAndStickers}
            placeholder={translations.search} className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none" />
          <button type="button" onClick={closeSearch} aria-label={translations.closeSearch}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="m-2 flex shrink-0 items-center gap-2">
        <TabsList className="grid flex-1 grid-cols-2">
          <TabsTrigger value="emoji">{translations.emojiTab}</TabsTrigger>
          <TabsTrigger value="stickers" disabled={!onSticker}>{translations.stickersTab}</TabsTrigger>
        </TabsList>
        {!searchOpen && (
          <button type="button" onClick={() => setSearchOpen(true)} aria-label={translations.searchEmojiAndStickers} title={translations.searchEmojiAndStickers}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <Search className="h-5 w-5" />
          </button>
        )}
      </div>
      <TabsContent value="emoji" className="mt-0 min-h-0 flex-1 overflow-y-auto">
        {results === null && !searching && EMOJI_SETS.map((set) => (
          <section key={set.label} className="px-3 pb-2">
            <h3 className="sticky top-0 z-10 bg-popover py-1.5 text-xs font-medium text-muted-foreground">{translations[set.label]}</h3>
            <EmojiGrid emoji={set.emoji} onEmoji={onEmoji} />
          </section>
        ))}
        {results !== null && (results.length ? <section className="px-3 pb-2"><EmojiGrid emoji={results} onEmoji={onEmoji} /></section> : empty)}
      </TabsContent>
      <TabsContent value="stickers" className="mt-0 min-h-0 flex-1">
        {onSticker && (
          <StickerTab filter={stickerFilter} onPick={(sticker) => { onSticker(sticker); onDone(); }} onManage={() => { onDone(); openStickerPacks(); }} />
        )}
      </TabsContent>
    </Tabs>
  );
};
