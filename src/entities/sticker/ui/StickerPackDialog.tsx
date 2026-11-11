import { useCallback, useEffect, useRef, useState } from 'react';
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
import { SheetGrip } from '@/shared/ui/SheetGrip';

const CLOSE_FALLBACK_MS = 700;

const useExitAnimation = (ref: StickerPackRef | null, onClose: () => void) => {
  const [open, setOpen] = useState(true);
  const closedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    closedRef.current = false;
    setOpen(true);
  }, [ref]);

  const finish = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    onCloseRef.current();
  }, []);

  useEffect(() => {
    if (open) return undefined;
    const timer = setTimeout(finish, CLOSE_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [open, finish]);

  return { open, close: () => setOpen(false), finish };
};

interface StickerPackDialogProps {
  pack: StickerPackRef | null;
  onClose: () => void;
}

export const StickerPackDialog = ({ pack: ref, onClose }: StickerPackDialogProps) => {
  const { translations } = useLanguage();
  const { currentData: pack, isError, isFetching } = useGetStickerPackQuery(ref ?? {}, { skip: !ref, refetchOnMountOrArgChange: true });
  const [setInstalled, { isLoading: saving, isError: saveFailed }] = useSetStickerPackInstalledMutation();
  const isMobile = useIsMobile();
  const exit = useExitAnimation(ref, onClose);
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
      <Drawer open={!!ref && exit.open} onOpenChange={(open) => { if (!open) exit.close(); }} shouldScaleBackground={false}
        onAnimationEnd={(open) => { if (!open) exit.finish(); }}>
        <DrawerContent data-testid="sticker-pack-sheet" className="max-h-[85dvh] gap-3 rounded-t-3xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          onClick={(event) => event.stopPropagation()}>
          <div className="-mt-3 flex h-5 shrink-0 items-center justify-center"><SheetGrip /></div>
          {body}
        </DrawerContent>
      </Drawer>
    );
  }
  return (
    <Dialog open={!!ref && exit.open} onOpenChange={(open) => { if (!open) exit.close(); }}>
      <DialogContent className="max-h-[85dvh] max-w-md grid-rows-[auto_minmax(0,1fr)_auto] gap-3 p-4 sm:p-5" onClick={(event) => event.stopPropagation()}
        onAnimationEnd={(event) => { if (!exit.open && event.target === event.currentTarget) exit.finish(); }}>
        {body}
      </DialogContent>
    </Dialog>
  );
};
