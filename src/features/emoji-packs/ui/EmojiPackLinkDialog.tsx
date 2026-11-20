import { useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import { useGetEmojiPackByLinkQuery, useReportEmojiPackMutation, useSetEmojiPackInstalledMutation } from '@/entities/emoji';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog';
import { CustomEmoji } from '@/shared/ui/CustomEmoji';
import { PackReport } from '@/shared/ui/PackReportPage';
import { useIsMobile } from '@/shared/hooks/use-mobile';

export const EmojiPackLinkDialog = ({ slug, onClose }: { slug: string; onClose: () => void }) => {
  const { translations } = useLanguage();
  const t = translations.customEmoji;
  const { data: pack, isLoading, isError } = useGetEmojiPackByLinkQuery(slug);
  const [setInstalled, { isLoading: saving }] = useSetEmojiPackInstalledMutation();
  const [report] = useReportEmojiPackMutation();
  const [reportStep, setReportStep] = useState<'page' | 'sent'>();
  const isMobile = useIsMobile();
  const reportPage = reportStep === 'page' && isMobile;
  const reported = reportStep === 'sent';
  const toggle = async () => {
    if (!pack) return;
    await setInstalled({ packId: pack.id, installed: !pack.is_installed }).unwrap();
    onClose();
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md gap-3">
        <DialogTitle className={reportPage ? 'sr-only' : undefined}>{pack?.title ?? t.title}</DialogTitle>
        <DialogDescription className="sr-only">{t.title}</DialogDescription>
        {pack && reportStep === 'page' && (
          <PackReport mobile={isMobile} onClose={() => setReportStep(undefined)} onSent={() => setReportStep('sent')}
            onSubmit={(reason) => report({ packId: pack.id, reason }).unwrap()} />
        )}
        {isLoading && <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />}
        {isError && <p className="text-sm text-muted-foreground">{translations.errorLoading}</p>}
        {pack && !reportPage && (
          <>
            <div data-testid="emoji-pack-preview" className="grid max-h-72 grid-cols-6 gap-2 overflow-y-auto">
              {pack.emoji.map((emoji) => (
                <div key={emoji.id} className="flex flex-col items-center gap-1" title={`:${emoji.shortcode}:`}>
                  <CustomEmoji id={emoji.id} shortcode={emoji.shortcode} className="h-9 w-9" />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {!pack.is_mine && (
                <button type="button" onClick={() => void toggle()} disabled={saving}
                  className={`motion-press inline-flex h-10 flex-1 items-center justify-center rounded-xl text-sm font-medium ${pack.is_installed ? 'border border-border hover:bg-accent' : 'bg-primary text-primary-foreground'}`}>
                  {pack.is_installed ? t.removePack : t.addPack}
                </button>
              )}
              {!pack.is_mine && (
                <button type="button" onClick={() => setReportStep('page')} disabled={reported} aria-label={reported ? t.reported : t.report}
                  className="motion-press flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent disabled:opacity-50">
                  <Flag className="h-4 w-4" />
                </button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
