import { useEffect, useState } from 'react';
import { closeStickerManager, openStickerPacks, StickerPackDialog, useStickerManagerRequest } from '@/entities/sticker';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog';
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
      {linkSlug && <StickerPackDialog pack={{ slug: linkSlug }} onClose={() => onLinkClose?.()} />}
      {request?.kind === 'packs' && (
        <Dialog open onOpenChange={(open) => { if (!open) closeStickerManager(); }}>
          <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto p-4 sm:p-5">
            <DialogTitle className="text-base">{translations.myStickerPacks}</DialogTitle>
            <DialogDescription className="sr-only">{translations.stickerPackPrivacy}</DialogDescription>
            {packId ? <StickerPackEditor packId={packId} onBack={() => setPackId(null)} /> : <MyStickerPacks onOpen={setPackId} />}
          </DialogContent>
        </Dialog>
      )}
      {request?.kind === 'make' && (
        <StickerMaker sourceUrl={request.sourceUrl} onClose={closeStickerManager} onSaved={(saved) => openStickerPacks(saved)} />
      )}
    </>
  );
};
