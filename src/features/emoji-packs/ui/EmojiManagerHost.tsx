import { useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { closeEmojiManager, useCreateEmojiPackMutation, useEmojiManagerRequest, useEmojiPacks } from '@/entities/emoji';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog';
import { BackToClose } from '@/shared/ui/BackToClose';
import { CustomEmoji } from '@/shared/ui/CustomEmoji';
import { EmojiPackEditor } from './EmojiPackEditor';
import { EmojiPackLinkDialog } from './EmojiPackLinkDialog';

const DIALOG = 'flex h-[100dvh] max-h-[100dvh] max-w-none flex-col gap-3 overflow-y-auto rounded-none p-4 sm:h-auto sm:max-h-[85dvh] sm:max-w-xl sm:rounded-2xl sm:p-6';

const MyEmojiPacks = ({ onOpen }: { onOpen: (packId: string) => void }) => {
  const { translations } = useLanguage();
  const t = translations.customEmoji;
  const packs = useEmojiPacks().filter((pack) => pack.is_mine || pack.is_installed);
  const [title, setTitle] = useState('');
  const [create, { isLoading }] = useCreateEmojiPackMutation();
  const submit = async () => {
    if (!title.trim()) return;
    const pack = await create(title.trim()).unwrap();
    setTitle('');
    onOpen(pack.id);
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input aria-label={t.newPackTitle} placeholder={t.newPackTitle} value={title} maxLength={64} onChange={(event) => setTitle(event.target.value)}
          className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <button type="button" onClick={() => void submit()} disabled={!title.trim() || isLoading}
          className="motion-press inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{t.createPack}
        </button>
      </div>
      {packs.length === 0 && <p className="text-sm text-muted-foreground">{t.noPacks}</p>}
      <ul className="space-y-1">
        {packs.map((pack) => (
          <li key={pack.id}>
            <button type="button" onClick={() => onOpen(pack.id)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-accent">
              <span className="flex -space-x-1">
                {pack.emoji.slice(0, 3).map((emoji) => <CustomEmoji key={emoji.id} id={emoji.id} shortcode={emoji.shortcode} className="h-7 w-7" />)}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{pack.title}</span>
              <span className="text-xs text-muted-foreground">{pack.emoji.length}{pack.is_hidden ? ` · ${t.hidden}` : ''}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const EmojiManagerHost = ({ linkSlug, onLinkClose }: { linkSlug?: string | null; onLinkClose?: () => void }) => {
  const { translations } = useLanguage();
  const request = useEmojiManagerRequest();
  const packs = useEmojiPacks();
  const [packId, setPackId] = useState<string | null>(null);
  useEffect(() => {
    if (request?.kind === 'packs') setPackId(request.packId ?? null);
  }, [request]);
  const pack = packId ? packs.find((item) => item.id === packId) : undefined;
  return (
    <>
      {request && <BackToClose flag="emojiManager" onClose={closeEmojiManager} />}
      {linkSlug && <EmojiPackLinkDialog slug={linkSlug} onClose={() => onLinkClose?.()} />}
      {request?.kind === 'link' && <EmojiPackLinkDialog slug={request.slug} onClose={closeEmojiManager} />}
      {request?.kind === 'packs' && (
        <Dialog open onOpenChange={(open) => { if (!open) closeEmojiManager(); }}>
          <DialogContent className={DIALOG}>
            <DialogTitle className="pr-8 text-lg">{translations.customEmoji.myPacks}</DialogTitle>
            <DialogDescription className="sr-only">{translations.customEmoji.title}</DialogDescription>
            {pack ? <EmojiPackEditor pack={pack} onBack={() => setPackId(null)} /> : <MyEmojiPacks onOpen={setPackId} />}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
