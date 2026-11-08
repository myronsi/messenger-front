import type { Translations } from '@/shared/contexts/LanguageContext';
import React, { useRef, useState } from 'react';
import { MessageSquarePlus, PenSquare, QrCode, Search, UsersRound } from 'lucide-react';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { Drawer, DrawerContent, DrawerTitle } from '@/shared/ui/drawer';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { fillTemplate } from '@/shared/lib/fillTemplate';

interface ChatsListHeaderProps {
  translations: Translations;
  avatarUrl?: string;
  displayName?: string;
  onOpenProfile: () => void;
  onOpenSearch: (rect: DOMRect) => void;
  onNewGroup: () => void;
  onScanQr: () => void;
  profileIndicatorCount?: number;
}

type NewAction = { key: string; icon: React.ReactNode; label: string; hint: string; run: () => void };

const ChatsListHeader: React.FC<ChatsListHeaderProps> = ({
  translations, avatarUrl, displayName, onOpenProfile, onOpenSearch, onNewGroup, onScanQr, profileIndicatorCount = 0,
}) => {
  const t = translations.appShell;
  const isMobile = useIsMobile();
  const searchButton = useRef<HTMLButtonElement | null>(null);
  const newButton = useRef<HTMLButtonElement | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const rectOf = (element: HTMLElement | null) => element?.getBoundingClientRect() ?? new DOMRect();
  const count = profileIndicatorCount > 99 ? '99+' : String(profileIndicatorCount);
  const profileLabel = profileIndicatorCount === 1 ? t.openSettingsWithRequest
    : profileIndicatorCount > 0 ? fillTemplate(t.openSettingsWithRequests, { count }) : t.openSettings;
  const actions: NewAction[] = [
    { key: 'chat', icon: <MessageSquarePlus className="h-5 w-5 text-primary" />, label: t.newChat, hint: t.newChatHint, run: () => onOpenSearch(rectOf(newButton.current)) },
    { key: 'group', icon: <UsersRound className="h-5 w-5 text-emerald-700" />, label: t.newGroup, hint: t.newGroupHint, run: onNewGroup },
    { key: 'qr', icon: <QrCode className="h-5 w-5 text-slate-600" />, label: t.scanQr, hint: t.scanQrHint, run: onScanQr },
  ];

  return (
    <div className="flex h-[72px] shrink-0 items-center gap-2 border-b border-border px-4">
      <button
        type="button"
        onClick={onOpenProfile}
        aria-label={profileLabel}
        title={t.openSettings}
        className="relative h-10 w-10 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <AuthenticatedImage src={avatarUrl} initialsFrom={displayName || '?'} alt="" className="h-10 w-10 rounded-full border border-gray-200 object-cover" />
        {profileIndicatorCount > 0 && (
          <span aria-hidden="true"
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
            {count}
          </span>
        )}
      </button>
      <h2 className="min-w-0 flex-1 truncate text-xl font-semibold">{translations.chats}</h2>
      <button ref={searchButton} type="button" onClick={() => onOpenSearch(rectOf(searchButton.current))} aria-label="Open search"
        className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-accent">
        <Search className="h-5 w-5" />
      </button>
      {isMobile ? (
        <>
          <button ref={newButton} type="button" onClick={() => setSheetOpen(true)} aria-label={t.newMenuLabel}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90">
            <PenSquare className="h-5 w-5" />
          </button>
          <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
            <DrawerContent aria-describedby={undefined} className="px-4 pb-6">
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
          </Drawer>
        </>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button ref={newButton} type="button" aria-label={t.newMenuLabel}
              className="flex h-10 items-center gap-1.5 rounded-full bg-primary pl-3 pr-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
              <PenSquare className="h-4 w-4" />
              {t.newAction}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
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
    </div>
  );
};

export default ChatsListHeader;
