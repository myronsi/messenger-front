import { StickerImage, useListRecentStickersQuery, useListStickerPacksQuery, type Sticker, type StickerPack } from '@/entities/sticker';
import { recentStickersKey, stickerPacksKey, useStoredValue } from '@/shared/api/offlineStore';
import { useLanguage } from '@/shared/contexts/LanguageContext';

const STICKERS_FRESH_SECONDS = 60;

interface StickerTabProps {
  onPick: (sticker: Sticker) => void;
  onManage?: () => void;
  filter?: (sticker: Sticker, packTitle: string) => boolean;
}

interface SectionProps {
  title: string;
  stickers: Sticker[];
  onPick: (sticker: Sticker) => void;
  label: (emoji: string) => string;
}

const Section = ({ title, stickers, onPick, label }: SectionProps) => (
  <section className="px-3 pb-3">
    <h3 className="sticky top-0 z-10 bg-popover py-1.5 text-xs font-medium text-muted-foreground">{title}</h3>
    <div className="grid grid-cols-4 gap-1 sm:grid-cols-5">
      {stickers.map((sticker) => (
        <button key={sticker.id} type="button" aria-label={label(sticker.emoji)} title={sticker.emoji}
          className="motion-press aspect-square rounded-lg p-1 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onPick(sticker)}>
          <StickerImage url={sticker.image.url} emoji={sticker.emoji} className="h-full w-full" />
        </button>
      ))}
    </div>
  </section>
);

export const StickerTab = ({ onPick, onManage, filter }: StickerTabProps) => {
  const { translations } = useLanguage();
  const packs = useListStickerPacksQuery(undefined, { refetchOnMountOrArgChange: STICKERS_FRESH_SECONDS });
  const recent = useListRecentStickersQuery(undefined, { refetchOnMountOrArgChange: STICKERS_FRESH_SECONDS });
  const storedPacks = useStoredValue<StickerPack[]>(stickerPacksKey);
  const storedRecent = useStoredValue<Sticker[]>(recentStickersKey);
  const packList = packs.currentData ?? storedPacks;
  const label = (emoji: string) => translations.stickerLabel.replace('{emoji}', emoji);
  const manage = onManage && (
    <button type="button" className="rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground hover:bg-accent/80" onClick={onManage}>
      {translations.myStickerPacks}
    </button>
  );
  const message = (text: string, retry?: () => void) => (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
      <p>{text}</p>
      {retry && <button type="button" className="rounded-full bg-accent px-3 py-1 text-accent-foreground" onClick={retry}>{translations.stickersRetry}</button>}
      {!retry && manage}
    </div>
  );
  if (!packList) {
    return packs.isError && !packs.isFetching ? message(translations.stickersUnavailable, () => { void packs.refetch(); }) : message(translations.loading);
  }
  const keep = (stickers: Sticker[], title: string) => (filter ? stickers.filter((sticker) => filter(sticker, title)) : stickers);
  const recentStickers = keep(recent.currentData ?? storedRecent ?? [], '');
  const filled = packList.map((pack) => ({ ...pack, stickers: keep(pack.stickers, pack.title) })).filter((pack) => pack.stickers.length > 0);
  if (!filled.length && !recentStickers.length) return message(filter ? translations.noSearchResults : translations.noStickerPacks);
  return (
    <div className="h-full overflow-y-auto" data-testid="sticker-tab">
      {manage && <div className="flex justify-end px-3 pb-1">{manage}</div>}
      {recentStickers.length > 0 && <Section title={translations.recentStickers} stickers={recentStickers} onPick={onPick} label={label} />}
      {filled.map((pack) => (
        <Section key={pack.id} title={pack.title} stickers={pack.stickers} onPick={onPick} label={label} />
      ))}
    </div>
  );
};
