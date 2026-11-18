import { useState } from 'react';
import { Smile } from 'lucide-react';
import { useCreateEmojiPackMutation, useListEmojiPacksQuery } from '@/entities/emoji';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { CustomEmoji } from '@/shared/ui/CustomEmoji';
import { PackCreateBar, PackEmpty, PackRow } from '@/shared/ui/PackManagerParts';
import { MAX_EMOJI_PACKS, maxEmojiOf } from '../model/emojiLimits';

const statusOf = (error: unknown) => (typeof error === 'object' && error !== null && 'status' in error ? (error as { status: unknown }).status : null);

export const MyEmojiPacks = ({ onOpen }: { onOpen: (packId: string) => void }) => {
  const { translations } = useLanguage();
  const t = translations.customEmoji;
  const { data, isError, refetch } = useListEmojiPacksQuery();
  const [create, { isLoading }] = useCreateEmojiPackMutation();
  const [error, setError] = useState<string | null>(null);
  const packs = data?.filter((pack) => !pack.chat_id && (pack.is_mine || pack.is_installed));
  const own = packs?.filter((pack) => pack.is_mine).length ?? 0;

  const onCreate = async (title: string) => {
    setError(null);
    try {
      const pack = await create(title).unwrap();
      onOpen(pack.id);
      return true;
    } catch (caught) {
      setError(statusOf(caught) === 409 ? t.packLimitReached : t.createFailed);
      return false;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PackCreateBar summary={packs ? t.packCountOfMax.replace('{count}', String(own)).replace('{max}', String(MAX_EMOJI_PACKS)) : ''}
        newLabel={t.newPack} titleLabel={t.newPackTitle} createLabel={t.createPack} cancelLabel={t.cancel}
        busy={isLoading} alwaysOpen={packs?.length === 0} onCreate={onCreate} />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {packs?.length === 0 && <PackEmpty icon={<Smile className="h-6 w-6" />} title={t.noPacks} text={t.noPacksHint} />}
      {!packs ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {isError ? t.loadFailed : translations.loading}
          {isError && <button type="button" className="ml-2 underline" onClick={() => { void refetch(); }}>{t.retry}</button>}
        </p>
      ) : packs.length > 0 && (
        <ul className="flex flex-col gap-2">
          {packs.map((pack, index) => (
            <PackRow key={pack.id} index={index} title={pack.title} onOpen={() => onOpen(pack.id)}
              detail={pack.is_mine
                ? t.emojiCountOfMax.replace('{count}', String(pack.emoji.length)).replace('{max}', String(maxEmojiOf(pack)))
                : t.emojiCount.replace('{count}', String(pack.emoji.length))}
              badge={pack.is_hidden ? t.hidden : undefined} placeholder={<Smile className="h-5 w-5" />}
              preview={pack.emoji.slice(0, 4).map((emoji) => <CustomEmoji key={emoji.id} id={emoji.id} shortcode={emoji.shortcode} className="h-8 w-8" />)} />
          ))}
        </ul>
      )}
    </div>
  );
};
