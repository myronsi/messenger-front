import { Settings2 } from 'lucide-react';
import { openEmojiPacks, rememberEmoji, useEmojiPacks, useRecentEmoji, type CustomEmoji as Emoji } from '@/entities/emoji';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { emojiToken, parseEmojiTokens } from '@/shared/lib/customEmoji';
import { CustomEmoji } from '@/shared/ui/CustomEmoji';
import { matchesShortcode } from '../model/emojiAutocomplete';

interface Props {
  query: string;
  onInsert: (text: string) => void;
  onDone: () => void;
}

const CELL = 'flex aspect-square items-center justify-center rounded-md text-2xl leading-none transition-colors hover:bg-accent';
const HEADING = 'sticky top-0 z-10 bg-popover py-1.5 text-xs font-medium text-muted-foreground';

export const CustomEmojiSections = ({ query, onInsert, onDone }: Props) => {
  const { translations } = useLanguage();
  const t = translations.customEmoji;
  const packs = useEmojiPacks().filter((pack) => pack.emoji.length > 0 && (!pack.is_hidden || pack.is_mine));
  const recent = useRecentEmoji();
  const pick = (emoji: Emoji) => {
    rememberEmoji(emojiToken(emoji));
    onInsert(`:${emoji.shortcode}:`);
  };
  const pickRecent = (value: string) => {
    const token = parseEmojiTokens(value)[0];
    rememberEmoji(value);
    onInsert(token ? `:${token.shortcode}:` : value);
  };
  const grid = (items: Emoji[]) => (
    <div className="grid grid-cols-8 gap-0.5">
      {items.map((emoji) => (
        <button key={emoji.id} type="button" aria-label={`:${emoji.shortcode}:`} title={`:${emoji.shortcode}:`} onClick={() => pick(emoji)} className={CELL}>
          <CustomEmoji id={emoji.id} shortcode={emoji.shortcode} className="h-7 w-7" />
        </button>
      ))}
    </div>
  );
  if (query.trim()) {
    const found = packs.flatMap((pack) => pack.emoji).filter((emoji) => matchesShortcode(emoji, query));
    return found.length ? <section data-testid="custom-emoji-results" className="px-3 pb-2">{grid(found)}</section> : null;
  }
  return (
    <>
      {recent.length > 0 && (
        <section className="px-3 pb-2">
          <h3 className={HEADING}>{t.recent}</h3>
          <div className="grid grid-cols-8 gap-0.5">
            {recent.map((value) => {
              const token = parseEmojiTokens(value)[0];
              return (
                <button key={value} type="button" aria-label={token ? `:${token.shortcode}:` : value} onClick={() => pickRecent(value)} className={CELL}>
                  {token ? <CustomEmoji id={token.id} shortcode={token.shortcode} className="h-7 w-7" /> : value}
                </button>
              );
            })}
          </div>
        </section>
      )}
      {packs.map((pack) => (
        <section key={pack.id} data-testid="custom-emoji-pack" className="px-3 pb-2">
          <h3 className={HEADING}>{pack.title}</h3>
          {grid(pack.emoji)}
        </section>
      ))}
      <div className="px-3 pb-3">
        <button type="button" onClick={() => { onDone(); openEmojiPacks(); }}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Settings2 className="h-4 w-4" />{t.manage}
        </button>
      </div>
    </>
  );
};
