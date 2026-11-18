import { useState } from 'react';
import { Sticker } from 'lucide-react';
import { StickerImage, useCreateStickerPackMutation, useListOwnStickerPacksQuery } from '@/entities/sticker';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { PackCreateBar, PackEmpty, PackRow } from '@/shared/ui/PackManagerParts';
import { stickerErrorText } from '../model/stickerErrors';

interface MyStickerPacksProps {
  onOpen: (packId: string) => void;
}

const MAX_PACKS = 50;
const MAX_STICKERS = 120;

export const MyStickerPacks = ({ onOpen }: MyStickerPacksProps) => {
  const { translations } = useLanguage();
  const { currentData: packs, isError, refetch } = useListOwnStickerPacksQuery(undefined, { refetchOnMountOrArgChange: true });
  const [create, { isLoading }] = useCreateStickerPackMutation();
  const [error, setError] = useState<string | null>(null);

  const onCreate = async (title: string) => {
    setError(null);
    try {
      const pack = await create(title).unwrap();
      onOpen(pack.id);
      return true;
    } catch (caught) {
      setError(stickerErrorText(caught, translations, 'pack'));
      return false;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PackCreateBar
        summary={packs ? translations.stickerPackCountOfMax.replace('{count}', String(packs.length)).replace('{max}', String(MAX_PACKS)) : ''}
        newLabel={translations.newStickerPack} titleLabel={translations.stickerPackTitle} createLabel={translations.createStickerPack}
        cancelLabel={translations.cancel} busy={isLoading} alwaysOpen={packs?.length === 0} onCreate={onCreate} />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {packs?.length === 0 && (
        <PackEmpty icon={<Sticker className="h-6 w-6" />} title={translations.noOwnStickerPacksTitle} text={translations.noOwnStickerPacks} />
      )}
      {!packs ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {isError ? translations.stickersUnavailable : translations.loading}
          {isError && <button type="button" className="ml-2 underline" onClick={() => { void refetch(); }}>{translations.stickersRetry}</button>}
        </p>
      ) : packs.length > 0 && (
        <ul className="flex flex-col gap-2">
          {packs.map((pack, index) => (
            <PackRow key={pack.id} index={index} title={pack.title} onOpen={() => onOpen(pack.id)}
              detail={translations.stickerCountOfMax.replace('{count}', String(pack.stickers.length)).replace('{max}', String(MAX_STICKERS))}
              badge={pack.is_hidden ? translations.stickerPackHidden : undefined} placeholder={<Sticker className="h-5 w-5" />}
              preview={pack.stickers.slice(0, 4).map((sticker) => (
                <StickerImage key={sticker.id} url={sticker.image.url} stillUrl={sticker.image.panel_url} emoji={sticker.emoji} className="h-full w-full" />
              ))} />
          ))}
        </ul>
      )}
    </div>
  );
};
