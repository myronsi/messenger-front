import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ChevronRight, EyeOff, Plus, Sticker } from 'lucide-react';
import { StickerImage, useCreateStickerPackMutation, useListOwnStickerPacksQuery } from '@/entities/sticker';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Button } from '@/shared/ui/button';
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
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showForm = creating || packs?.length === 0;
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating) titleRef.current?.focus();
  }, [creating]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    setError(null);
    try {
      const pack = await create(title.trim()).unwrap();
      setTitle('');
      setCreating(false);
      onOpen(pack.id);
    } catch (caught) {
      setError(stickerErrorText(caught, translations, 'pack'));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {packs ? translations.stickerPackCountOfMax.replace('{count}', String(packs.length)).replace('{max}', String(MAX_PACKS)) : ''}
        </span>
        {!showForm && (
          <Button size="sm" onClick={() => setCreating(true)}><Plus className="mr-1.5 h-4 w-4" />{translations.newStickerPack}</Button>
        )}
      </div>
      {packs?.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Sticker className="h-6 w-6" /></span>
          <p className="font-medium">{translations.noOwnStickerPacksTitle}</p>
          <p className="text-sm text-muted-foreground">{translations.noOwnStickerPacks}</p>
        </div>
      )}
      {showForm && (
        <form className="flex gap-2" onSubmit={(event) => { void submit(event); }}>
          <input ref={titleRef} className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" maxLength={64}
            placeholder={translations.stickerPackTitle} aria-label={translations.stickerPackTitle} value={title}
            onChange={(event) => setTitle(event.target.value)} />
          {creating && <Button type="button" variant="ghost" onClick={() => { setCreating(false); setTitle(''); }}>{translations.cancel}</Button>}
          <Button type="submit" disabled={!title.trim() || isLoading}>{translations.createStickerPack}</Button>
        </form>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!packs ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {isError ? translations.stickersUnavailable : translations.loading}
          {isError && <button type="button" className="ml-2 underline" onClick={() => { void refetch(); }}>{translations.stickersRetry}</button>}
        </p>
      ) : packs.length > 0 && (
        <ul className="flex flex-col gap-2">
          {packs.map((pack) => (
            <li key={pack.id}>
              <button type="button" onClick={() => onOpen(pack.id)}
                className="motion-press flex w-full items-center gap-3 rounded-xl border border-border p-2.5 text-left transition-colors hover:bg-accent">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted/60 p-1 text-muted-foreground">
                  {pack.stickers[0] ? <StickerImage url={pack.stickers[0].image.url} emoji={pack.stickers[0].emoji} className="h-full w-full" /> : <Sticker className="h-6 w-6" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium">{pack.title}</span>
                    {pack.is_hidden && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                        <EyeOff className="h-3 w-3" />{translations.stickerPackHidden}
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {translations.stickerCountOfMax.replace('{count}', String(pack.stickers.length)).replace('{max}', String(MAX_STICKERS))}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
