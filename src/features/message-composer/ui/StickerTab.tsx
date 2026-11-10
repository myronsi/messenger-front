import { StickerImage, useListRecentStickersQuery, useListStickerPacksQuery, type Sticker } from '@/entities/sticker';
import { useLanguage } from '@/shared/contexts/LanguageContext';

interface StickerTabProps {
  onPick: (sticker: Sticker) => void;
  onManage?: () => void;
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

export const StickerTab = ({ onPick, onManage }: StickerTabProps) => {
  const { translations } = useLanguage();
  const packs = useListStickerPacksQuery(undefined, { refetchOnMountOrArgChange: true });
  const recent = useListRecentStickersQuery(undefined, { refetchOnMountOrArgChange: true });
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
  if (!packs.currentData) {
    return packs.isError && !packs.isFetching ? message(translations.stickersUnavailable, () => { void packs.refetch(); }) : message(translations.loading);
  }
  const recentStickers = recent.currentData ?? [];
  const filled = packs.currentData.filter((pack) => pack.stickers.length > 0);
  if (!filled.length && !recentStickers.length) return message(translations.noStickerPacks);
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
