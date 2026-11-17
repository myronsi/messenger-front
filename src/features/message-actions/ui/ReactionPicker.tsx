import { useState } from 'react';
import { Search } from 'lucide-react';
import { rememberEmoji, useEmojiPacks, useRecentEmoji, type CustomEmoji as Emoji } from '@/entities/emoji';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { customReaction, emojiToken, parseEmojiTokens } from '@/shared/lib/customEmoji';
import { EMOJI_SETS } from '@/shared/lib/emojiSets';
import { CustomEmoji } from '@/shared/ui/CustomEmoji';

const CELL = 'flex aspect-square items-center justify-center rounded-md text-xl leading-none transition-colors hover:bg-accent';
const HEADING = 'sticky top-0 z-10 bg-popover py-1 text-xs font-medium text-muted-foreground';
const GRID = 'grid grid-cols-8 gap-0.5';

export const ReactionPicker = ({ onPick, embedded = false }: { onPick: (reaction: string) => void; embedded?: boolean }) => {
  const { translations } = useLanguage();
  const t = translations.customEmoji;
  const [query, setQuery] = useState('');
  const packs = useEmojiPacks().filter((pack) => pack.emoji.length > 0 && (!pack.is_hidden || pack.is_mine));
  const recent = useRecentEmoji();
  const search = query.trim().toLowerCase().replace(/:/g, '');

  const pickCustom = (emoji: Emoji) => {
    rememberEmoji(emojiToken(emoji));
    onPick(customReaction(emoji.id));
  };
  const pickRecent = (value: string) => {
    const token = parseEmojiTokens(value)[0];
    rememberEmoji(value);
    onPick(token ? customReaction(token.id) : value);
  };
  const pickUnicode = (value: string) => {
    rememberEmoji(value);
    onPick(value);
  };
  const customGrid = (items: Emoji[]) => (
    <div className={GRID}>
      {items.map((emoji) => (
        <button key={emoji.id} type="button" aria-label={`:${emoji.shortcode}:`} title={`:${emoji.shortcode}:`} onClick={() => pickCustom(emoji)} className={CELL}>
          <CustomEmoji id={emoji.id} shortcode={emoji.shortcode} className="h-6 w-6" />
        </button>
      ))}
    </div>
  );
  const found = search ? packs.flatMap((pack) => pack.emoji).filter((emoji) => emoji.shortcode.includes(search)) : [];

  return (
    <div data-testid="reaction-picker" onClick={(event) => event.nativeEvent.stopPropagation()}
      className={embedded ? 'px-2 pb-2' : 'w-72 rounded-2xl border border-border bg-popover p-2 shadow-lg'}>
      <label className="mb-1 flex items-center gap-2 rounded-full bg-muted px-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.searchCustom} aria-label={t.searchCustom}
          className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
      </label>
      <div className="max-h-64 overflow-y-auto">
        {search ? customGrid(found) : (
          <>
            {recent.length > 0 && (
              <section>
                <h3 className={HEADING}>{t.recent}</h3>
                <div className={GRID}>
                  {recent.map((value) => {
                    const token = parseEmojiTokens(value)[0];
                    return (
                      <button key={value} type="button" aria-label={token ? `:${token.shortcode}:` : value} onClick={() => pickRecent(value)} className={CELL}>
                        {token ? <CustomEmoji id={token.id} shortcode={token.shortcode} className="h-6 w-6" /> : value}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
            {packs.map((pack) => (
              <section key={pack.id}>
                <h3 className={HEADING}>{pack.title}</h3>
                {customGrid(pack.emoji)}
              </section>
            ))}
            {EMOJI_SETS.map((set) => (
              <section key={set.label}>
                <h3 className={HEADING}>{translations[set.label]}</h3>
                <div className={GRID}>
                  {set.emoji.map((value) => (
                    <button key={value} type="button" aria-label={value} onClick={() => pickUnicode(value)} className={CELL}>{value}</button>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
