import { useRef, useState } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { copyText } from '@/shared/lib/copyText';
import { useDismissFirstMenu } from '@/shared/lib/useDismissFirstMenu';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from '@/shared/ui/context-menu';
import { ExternalLinkConfirm } from './ExternalLinkConfirm';

export function MessageLink({ href, children }: { href: string; children: string }) {
  const { translations } = useLanguage();
  const [open, setOpen] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const held = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useDismissFirstMenu(open, menuRef, () => setOpen(false));
  return (
    <>
    <ContextMenu open={open} onOpenChange={value => { setOpen(value); if (value) { held.current = true; setCopyFailed(false); } }}>
      <ContextMenuTrigger asChild>
        <a ref={linkRef} href={href} target="_blank" rel="noopener noreferrer" className="select-none break-words text-inherit underline decoration-current underline-offset-2"
          style={{ WebkitTouchCallout: 'none' }}
          onPointerDown={event => { event.stopPropagation(); if (!open) held.current = false; }}
          onTouchStart={event => event.stopPropagation()} onTouchMove={event => event.stopPropagation()}
          onTouchEnd={event => event.stopPropagation()} onTouchCancel={event => event.stopPropagation()}
          onContextMenu={event => event.stopPropagation()}
          onClick={event => {
            event.preventDefault(); event.stopPropagation();
            if (held.current) { held.current = false; return; }
            setConfirming(true);
          }}>
          {children}
        </a>
      </ContextMenuTrigger>
      <ContextMenuContent ref={menuRef} className="z-[11000]" onClick={event => event.stopPropagation()} onContextMenu={event => event.stopPropagation()}
        onCloseAutoFocus={event => { if (confirming) event.preventDefault(); }}
        onTouchStart={event => event.stopPropagation()} onTouchMove={event => event.stopPropagation()}
        onTouchEnd={event => event.stopPropagation()} onTouchCancel={event => event.stopPropagation()}>
        <ContextMenuItem onSelect={event => { event.preventDefault(); setOpen(false); setConfirming(true); }}>
          <ExternalLink className="mr-2 h-4 w-4" />{translations.openLink}
        </ContextMenuItem>
        <ContextMenuItem onSelect={event => {
          event.preventDefault();
          void copyText(href).then(copied => { if (copied) setOpen(false); else setCopyFailed(true); });
        }}><Copy className="mr-2 h-4 w-4" />{copyFailed ? translations.copyLinkFailed : translations.copyLink}</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
    <ExternalLinkConfirm href={href} open={confirming} onOpenChange={setConfirming} trigger={linkRef} />
    </>
  );
}
