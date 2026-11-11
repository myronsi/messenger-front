import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Button } from '@/shared/ui/button';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/shared/ui/drawer';
import { useGetStickerPackQuery, useSetStickerPackInstalledMutation } from '../api/stickerApi';
import { openStickerPacks } from '../model/manager';
import type { StickerPackRef } from '../model/types';
import { StickerImage } from './StickerImage';
import { StickerPackReport } from './StickerPackReport';

interface StickerPackDialogProps {
  pack: StickerPackRef | null;
  onClose: () => void;
}

export const StickerPackDialog = ({ pack: ref, onClose }: StickerPackDialogProps) => {
  const { translations } = useLanguage();
  const { currentData: pack, isError, isFetching } = useGetStickerPackQuery(ref ?? {}, { skip: !ref, refetchOnMountOrArgChange: true });
  const [setInstalled, { isLoading: saving, isError: saveFailed }] = useSetStickerPackInstalledMutation();
  const isMobile = useIsMobile();
  const subtitle = pack?.is_official ? translations.stickerPackOfficial : pack?.is_mine ? translations.stickerPackMine : translations.stickerPackByUser;
  const Title = isMobile ? DrawerTitle : DialogTitle;
  const Description = isMobile ? DrawerDescription : DialogDescription;
  const body = (
    <>
      <div className={isMobile ? 'min-w-0 text-center' : 'min-w-0 pr-8'}>
        <Title className="truncate text-base">{pack?.title ?? translations.stickerPack}</Title>
        <Description className="mt-1 text-xs">
          {pack ? `${subtitle} · ${translations.stickerCount.replace('{count}', String(pack.stickers.length))}` : ' '}
        </Description>
      </div>
      <div className="min-h-24 overflow-y-auto">
        {pack ? (
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5" aria-label={pack.title}>
            {pack.stickers.map((sticker) => (
              <li key={sticker.id} className="aspect-square">
                <StickerImage url={sticker.image.url} emoji={sticker.emoji} className="h-full w-full" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {isError && !isFetching ? translations.stickerPackUnavailable : translations.loading}
          </p>
        )}
      </div>
      {pack && (
        <div className="flex flex-col gap-2">
          {pack.is_hidden && <p className="text-sm text-destructive">{translations.stickerPackHiddenNotice}</p>}
          {saveFailed && <p role="alert" className="text-sm text-destructive">{translations.stickerPackSaveFailed}</p>}
          {!pack.is_hidden && (
            <Button
              variant={pack.is_installed ? 'outline' : 'default'}
              disabled={saving}
              onClick={() => { void setInstalled({ packId: pack.id, installed: !pack.is_installed }); }}
            >
              {pack.is_installed ? translations.removeStickerPack : translations.addStickerPack}
            </Button>
          )}
          {pack.is_mine && <Button variant="ghost" onClick={() => { onClose(); openStickerPacks(pack.id); }}>{translations.editStickerPack}</Button>}
          {!pack.is_mine && !pack.is_official && <StickerPackReport packId={pack.id} />}
        </div>
      )}
    </>
  );
  if (isMobile) {
    return (
      <Drawer open={!!ref} onOpenChange={(open) => { if (!open) onClose(); }} shouldScaleBackground={false}>
        <DrawerContent data-testid="sticker-pack-sheet" className="max-h-[85dvh] gap-3 rounded-t-3xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          onClick={(event) => event.stopPropagation()}>
          <div aria-hidden="true" className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/30" />
          {body}
        </DrawerContent>
      </Drawer>
    );
  }
  return (
    <Dialog open={!!ref} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[85dvh] max-w-md grid-rows-[auto_minmax(0,1fr)_auto] gap-3 p-4 sm:p-5" onClick={(event) => event.stopPropagation()}>
        {body}
      </DialogContent>
    </Dialog>
  );
};
