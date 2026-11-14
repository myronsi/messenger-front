import type { Translations } from '@/shared/contexts/LanguageContext';
import React, { useRef, useState } from 'react';
import { Bookmark, MessageSquarePlus, PenSquare, QrCode, Search, UsersRound } from 'lucide-react';
import { TabHeader } from '@/shared/ui/TabHeader';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { Drawer, DrawerContent, DrawerTitle } from '@/shared/ui/drawer';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { useCanScanQr } from '@/shared/hooks/useCanScanQr';

interface ChatsListHeaderProps {
  translations: Translations;
  onOpenSearch: (rect: DOMRect) => void;
  onNewGroup: () => void;
  onScanQr: () => void;
  onOpenSaved?: () => void;
}

type NewAction = { key: string; icon: React.ReactNode; label: string; hint: string; run: () => void };

const ChatsListHeader: React.FC<ChatsListHeaderProps> = ({
  translations, onOpenSearch, onNewGroup, onScanQr, onOpenSaved,
}) => {
  const t = translations.appShell;
  const isMobile = useIsMobile();
  const canScanQr = useCanScanQr();
  const newMenuLabel = canScanQr ? t.newMenuLabel : t.newMenuLabelNoQr;
  const searchButton = useRef<HTMLButtonElement | null>(null);
  const newButton = useRef<HTMLButtonElement | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const rectOf = (element: HTMLElement | null) => element?.getBoundingClientRect() ?? new DOMRect();
  const actions: NewAction[] = [
    { key: 'chat', icon: <MessageSquarePlus className="h-5 w-5 text-primary" />, label: t.newChat, hint: t.newChatHint, run: () => onOpenSearch(rectOf(newButton.current)) },
    { key: 'group', icon: <UsersRound className="h-5 w-5 text-success" />, label: t.newGroup, hint: t.newGroupHint, run: onNewGroup },
    { key: 'qr', icon: <QrCode className="h-5 w-5 text-subtle-foreground" />, label: t.scanQr, hint: t.scanQrHint, run: onScanQr },
    ...(onOpenSaved ? [{ key: 'saved', icon: <Bookmark className="h-5 w-5 text-primary" />, label: translations.chatOrganizer.savedMessages,
      hint: translations.chatOrganizer.savedMessagesHint, run: onOpenSaved }] : []),
  ].filter((action) => canScanQr || action.key !== 'qr');

  return (
    <TabHeader title={translations.chats} actions={<>
      <button ref={searchButton} type="button" onClick={() => onOpenSearch(rectOf(searchButton.current))} aria-label={t.openSearch}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-accent">
        <Search className="h-5 w-5" />
      </button>
      {isMobile ? (
        <>
          <button ref={newButton} type="button" onClick={() => setSheetOpen(true)} aria-label={newMenuLabel}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90">
            <PenSquare className="h-5 w-5" />
          </button>
          {sheetOpen && <Drawer open onOpenChange={setSheetOpen} shouldScaleBackground={false} autoFocus>
            <DrawerContent aria-describedby={undefined} className="px-4 pb-6" style={{ animation: 'none' }}>
              <DrawerTitle className="px-1 pb-2 pt-3 text-lg font-semibold">{t.newAction}</DrawerTitle>
              <div className="flex flex-col gap-1">
                {actions.map((action) => (
                  <button key={action.key} type="button" onClick={() => { setSheetOpen(false); action.run(); }}
                    className="flex min-h-14 items-center gap-3 rounded-xl px-3 text-left transition-colors hover:bg-accent">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">{action.icon}</span>
                    <span className="flex min-w-0 flex-col"><span className="text-base font-medium">{action.label}</span>
                      <span className="text-sm text-muted-foreground">{action.hint}</span></span>
                  </button>
                ))}
              </div>
            </DrawerContent>
          </Drawer>}
        </>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button ref={newButton} type="button" aria-label={newMenuLabel}
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 xl:pr-4">
              <PenSquare className="h-4 w-4" />
              <span className="hidden xl:inline">{t.newAction}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64" onCloseAutoFocus={(event) => event.preventDefault()}>
            {actions.map((action, index) => (
              <React.Fragment key={action.key}>
                {index === 2 && <DropdownMenuSeparator />}
                <DropdownMenuItem onSelect={action.run} className="gap-3 py-2">
                  {action.icon}
                  <span className="flex flex-col"><span className="font-medium">{action.label}</span>
                    <span className="text-xs text-muted-foreground">{action.hint}</span></span>
                </DropdownMenuItem>
              </React.Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>} />
  );
};

export default ChatsListHeader;
