import { useEffect, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import { openOwnLink, ownLinkUrl } from '@/shared/lib/ownLink';
import { openStickerPack, stickerSlugFromHref } from '@/entities/sticker';
import { emojiSlugFromHref, openEmojiPackLink } from '@/entities/emoji';

export function ExternalLinkConfirm({ href, open, onOpenChange, trigger }: {
  href: string; open: boolean; onOpenChange: (open: boolean) => void; trigger: RefObject<HTMLAnchorElement | null>;
}) {
  const { translations } = useLanguage();
  const stickerSlug = stickerSlugFromHref(href);
  const emojiSlug = emojiSlugFromHref(href);
  const own = !!ownLinkUrl(href);
  useEffect(() => {
    if (!open || !own) return;
    if (stickerSlug) openStickerPack({ slug: stickerSlug });
    else if (emojiSlug) openEmojiPackLink(emojiSlug);
    else openOwnLink(href);
    onOpenChange(false);
  }, [open, own, href, stickerSlug, emojiSlug, onOpenChange]);
  if (!open || own) return null;
  return createPortal(
    <ConfirmModal
      title={translations.externalLinkTitle}
      message={translations.externalLinkDescription}
      details={<p className="max-h-40 overflow-y-auto break-all rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">{href}</p>}
      confirmText={translations.openLink}
      cancelText={translations.cancel}
      overlayClassName="z-[11002]"
      returnFocusRef={trigger}
      onCancel={() => onOpenChange(false)}
      onConfirm={() => { window.open(href, '_blank', 'noopener,noreferrer'); onOpenChange(false); }}
    />,
    document.body,
  );
}
