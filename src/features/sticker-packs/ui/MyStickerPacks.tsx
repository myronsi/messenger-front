import { useState, type FormEvent } from 'react';
import { ChevronRight } from 'lucide-react';
import { StickerImage, useCreateStickerPackMutation, useListOwnStickerPacksQuery } from '@/entities/sticker';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Button } from '@/shared/ui/button';
import { stickerErrorText } from '../model/stickerErrors';

interface MyStickerPacksProps {
  onOpen: (packId: string) => void;
}

export const MyStickerPacks = ({ onOpen }: MyStickerPacksProps) => {
  const { translations } = useLanguage();
  const { currentData: packs, isError, refetch } = useListOwnStickerPacksQuery(undefined, { refetchOnMountOrArgChange: true });
  const [create, { isLoading }] = useCreateStickerPackMutation();
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    setError(null);
    try {
      const pack = await create(title.trim()).unwrap();
      setTitle('');
      onOpen(pack.id);
    } catch (caught) {
      setError(stickerErrorText(caught, translations, 'pack'));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <form className="flex gap-2" onSubmit={(event) => { void submit(event); }}>
        <input className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" maxLength={64}
          placeholder={translations.stickerPackTitle} aria-label={translations.stickerPackTitle} value={title}
          onChange={(event) => setTitle(event.target.value)} />
        <Button type="submit" disabled={!title.trim() || isLoading}>{translations.createStickerPack}</Button>
      </form>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!packs ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {isError ? translations.stickersUnavailable : translations.loading}
          {isError && <button type="button" className="ml-2 underline" onClick={() => { void refetch(); }}>{translations.stickersRetry}</button>}
        </p>
      ) : packs.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{translations.noOwnStickerPacks}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {packs.map((pack) => (
            <li key={pack.id}>
              <button type="button" onClick={() => onOpen(pack.id)} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-accent">
                <span className="h-11 w-11 shrink-0 rounded-md bg-muted/40">
                  {pack.stickers[0] && <StickerImage url={pack.stickers[0].image.url} emoji={pack.stickers[0].emoji} className="h-full w-full" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{pack.title}</span>
                  <span className="block text-xs text-muted-foreground">{translations.stickerCount.replace('{count}', String(pack.stickers.length))}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">{translations.stickerPackPrivacy}</p>
    </div>
  );
};
