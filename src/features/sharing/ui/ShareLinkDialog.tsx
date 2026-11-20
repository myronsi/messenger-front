import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Share2, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { ModalSurface } from '@/shared/ui/ModalSurface';
import { Button } from '@/shared/ui/button';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { copyText } from '@/shared/lib/copyText';
import { fillTemplate } from '@/shared/lib/fillTemplate';

interface ShareLinkDialogProps {
  title: string;
  hint: string;
  url: string;
  onClose: () => void;
}

const canShare = (url: string) => typeof navigator.share === 'function' && (!navigator.canShare || navigator.canShare({ url }));

export const ShareLinkDialog = ({ title, hint, url, onClose }: ShareLinkDialogProps) => {
  const { translations } = useLanguage();
  const t = translations.sharing;
  const [copy, setCopy] = useState<'idle' | 'done' | 'failed'>('idle');
  const copyLink = () => void copyText(url).then((ok) => setCopy(ok ? 'done' : 'failed'));
  const share = () => void navigator.share({ title, url }).catch(() => undefined);
  return createPortal(
    <ModalSurface label={title}
      className="fixed inset-0 z-[11002] flex animate-fade-in items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}
      onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
      <div className="motion-panel-in relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-lg">
        <button type="button" onClick={onClose} aria-label={translations.close}
          className="motion-press absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
        <h3 className="mb-1 text-lg font-semibold">{title}</h3>
        <p className="mb-4 text-sm text-muted-foreground">{hint}</p>
        <div className="mx-auto mb-4 w-fit rounded-xl qr-surface p-3">
          <QRCodeSVG value={url} size={192} level="M" marginSize={1} title={fillTemplate(t.qrCode, { link: url })} />
        </div>
        <p data-testid="share-link-url" className="mb-4 break-all rounded-lg bg-muted px-3 py-2 text-sm">{url}</p>
        <div className="flex flex-col gap-2">
          <Button type="button" onClick={copyLink}>
            {copy === 'done' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copy === 'done' ? t.linkCopied : copy === 'failed' ? t.copyFailed : t.copyLink}
          </Button>
          {canShare(url) && (
            <Button type="button" variant="outline" onClick={share}><Share2 className="h-4 w-4" />{t.share}</Button>
          )}
        </div>
      </div>
    </ModalSurface>,
    document.body,
  );
};
