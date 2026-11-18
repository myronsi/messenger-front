import { closeStickerManager, openStickerPacks, StickerPackDialog, useStickerManagerRequest } from '@/entities/sticker';
import { BackToClose } from '@/shared/ui/BackToClose';
import { StickerMaker } from './StickerMaker';

interface StickerManagerHostProps {
  linkSlug?: string | null;
  onLinkClose?: () => void;
}

export const StickerManagerHost = ({ linkSlug, onLinkClose }: StickerManagerHostProps) => {
  const request = useStickerManagerRequest();

  return (
    <>
      {request && request.kind !== 'packs' && <BackToClose flag="stickerManager" onClose={closeStickerManager} />}
      {linkSlug && <StickerPackDialog pack={{ slug: linkSlug }} onClose={() => onLinkClose?.()} />}
      {request?.kind === 'pack' && <StickerPackDialog pack={request.pack} onClose={closeStickerManager} />}
      {request?.kind === 'make' && (
        <StickerMaker sourceUrl={request.sourceUrl} onClose={closeStickerManager} onSaved={(saved) => openStickerPacks(saved)} />
      )}
    </>
  );
};
