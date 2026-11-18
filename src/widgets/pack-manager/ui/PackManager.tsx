import { useEffect, useState } from 'react';
import { closeEmojiManager, useEmojiManagerRequest, useListEmojiPacksQuery } from '@/entities/emoji';
import { closeStickerManager, useStickerManagerRequest } from '@/entities/sticker';
import { EmojiPackEditor, MyEmojiPacks } from '@/features/emoji-packs';
import { MyStickerPacks, StickerPackEditor } from '@/features/sticker-packs';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { cn } from '@/shared/lib/utils';
import { BackToClose } from '@/shared/ui/BackToClose';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog';

type Tab = 'stickers' | 'emoji';
type Motion = 'motion-pack-tab' | 'motion-pack-forward' | 'motion-pack-back';

const DIALOG = 'flex h-[100dvh] max-h-[100dvh] max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-[min(760px,88dvh)] sm:max-w-xl sm:rounded-2xl';
const MOTION = ['sm:duration-300 max-sm:duration-300 max-sm:ease-[cubic-bezier(0.32,0.72,0,1)]',
  'max-sm:data-[state=open]:slide-in-from-bottom-1/2 max-sm:data-[state=closed]:slide-out-to-bottom-1/2',
  'max-sm:data-[state=open]:zoom-in-100 max-sm:data-[state=closed]:zoom-out-100 max-sm:data-[state=open]:fade-in-100 max-sm:data-[state=closed]:fade-out-100'].join(' ');

export const PackManager = () => {
  const { translations } = useLanguage();
  const t = translations.customEmoji;
  const stickerRequest = useStickerManagerRequest();
  const emojiRequest = useEmojiManagerRequest();
  const stickerPacks = stickerRequest?.kind === 'packs' ? stickerRequest : null;
  const emojiPacks = emojiRequest?.kind === 'packs' ? emojiRequest : null;
  const open = !!stickerPacks || !!emojiPacks;
  const [tab, setTab] = useState<Tab>('stickers');
  const [stickerPackId, setStickerPackId] = useState<string | null>(null);
  const [emojiPackId, setEmojiPackId] = useState<string | null>(null);
  const [motion, setMotion] = useState<Motion>('motion-pack-tab');
  const { data: emojiPackList } = useListEmojiPacksQuery();

  useEffect(() => {
    if (!stickerPacks) return;
    setMotion('motion-pack-tab');
    setTab('stickers');
    setStickerPackId(stickerPacks.packId ?? null);
  }, [stickerPacks]);

  useEffect(() => {
    if (!emojiPacks) return;
    setMotion('motion-pack-tab');
    setTab('emoji');
    setEmojiPackId(emojiPacks.packId ?? null);
  }, [emojiPacks]);

  const emojiPack = emojiPackId ? emojiPackList?.find((pack) => pack.id === emojiPackId) : undefined;
  const editing = tab === 'stickers' ? stickerPackId : emojiPack ? emojiPackId : null;
  const close = () => {
    if (stickerPacks) closeStickerManager();
    if (emojiPacks) closeEmojiManager();
  };
  const openPack = (packId: string) => {
    setMotion('motion-pack-forward');
    if (tab === 'stickers') setStickerPackId(packId);
    else setEmojiPackId(packId);
  };
  const backToList = () => {
    setMotion('motion-pack-back');
    if (tab === 'stickers') setStickerPackId(null);
    else setEmojiPackId(null);
  };
  const switchTab = (next: Tab) => {
    if (next === tab) return;
    setMotion('motion-pack-tab');
    setTab(next);
  };
  const tabs: { key: Tab; label: string }[] = [{ key: 'stickers', label: t.stickersTab }, { key: 'emoji', label: t.emojiTab }];

  return (
    <>
      {open && <BackToClose flag="packManager" onClose={close} />}
      {open && editing && <BackToClose key={`${tab}-${editing}`} flag="packEditor" onClose={backToList} />}
      <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
        <DialogContent className={cn(DIALOG, MOTION)} data-testid="pack-manager">
          <div className="shrink-0 space-y-3 border-b border-border px-4 pb-3 pt-4 sm:px-6 sm:pt-5">
            <DialogTitle className="pr-8 text-lg">{t.managerTitle}</DialogTitle>
            <DialogDescription className="sr-only">{t.title}</DialogDescription>
            <div role="tablist" aria-label={t.managerTitle} className="relative grid grid-cols-2 rounded-xl bg-muted p-1">
              <span aria-hidden="true" className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-background shadow-sm transition-transform duration-300 ease-out"
                style={{ transform: tab === 'emoji' ? 'translateX(100%)' : 'translateX(0)' }} />
              {tabs.map((item) => (
                <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} onClick={() => switchTab(item.key)}
                  className={cn('relative z-10 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    tab === item.key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div role="tabpanel" className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6">
            <div key={`${tab}-${editing ?? 'list'}`} className={cn('flex min-h-0 flex-1 flex-col', motion)}>
              {tab === 'stickers' && (stickerPackId
                ? <StickerPackEditor packId={stickerPackId} onBack={backToList} />
                : <MyStickerPacks onOpen={openPack} />)}
              {tab === 'emoji' && (emojiPack
                ? <EmojiPackEditor pack={emojiPack} onBack={backToList} />
                : <MyEmojiPacks onOpen={openPack} />)}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
