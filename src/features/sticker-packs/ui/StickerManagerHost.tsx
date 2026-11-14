import { useEffect, useState } from 'react';
import { closeStickerManager, openStickerPacks, StickerPackDialog, useStickerManagerRequest } from '@/entities/sticker';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog';
import { BackToClose } from '@/shared/ui/BackToClose';
import { MyStickerPacks } from './MyStickerPacks';
import { StickerMaker } from './StickerMaker';
import { StickerPackEditor } from './StickerPackEditor';

interface StickerManagerHostProps {
  linkSlug?: string | null;
  onLinkClose?: () => void;
}

export const StickerManagerHost = ({ linkSlug, onLinkClose }: StickerManagerHostProps) => {
  const { translations } = useLanguage();
  const request = useStickerManagerRequest();
  const [packId, setPackId] = useState<string | null>(null);

  useEffect(() => {
    if (request?.kind === 'packs') setPackId(request.packId ?? null);
  }, [request]);

  return (
    <>
      {request && <BackToClose flag="stickerManager" onClose={closeStickerManager} />}
      {linkSlug && <StickerPackDialog pack={{ slug: linkSlug }} onClose={() => onLinkClose?.()} />}
      {request?.kind === 'packs' && (
        <Dialog open onOpenChange={(open) => { if (!open) closeStickerManager(); }}>
          <DialogContent className="flex h-[100dvh] max-h-[100dvh] max-w-none flex-col gap-3 overflow-y-auto rounded-none p-4 sm:h-auto sm:max-h-[85dvh] sm:max-w-xl sm:rounded-2xl sm:p-6">
            <DialogTitle className="pr-8 text-lg">{translations.myStickerPacks}</DialogTitle>
            <DialogDescription className="sr-only">{translations.stickerPackPrivacy}</DialogDescription>
            {packId ? <StickerPackEditor packId={packId} onBack={() => setPackId(null)} /> : <MyStickerPacks onOpen={setPackId} />}
          </DialogContent>
        </Dialog>
      )}
      {request?.kind === 'pack' && <StickerPackDialog pack={request.pack} onClose={closeStickerManager} />}
      {request?.kind === 'make' && (
        <StickerMaker sourceUrl={request.sourceUrl} onClose={closeStickerManager} onSaved={(saved) => openStickerPacks(saved)} />
      )}
    </>
  );
};
