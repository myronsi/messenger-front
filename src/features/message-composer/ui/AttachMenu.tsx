import { Contact, FileImage, ListChecks, MapPin, Paperclip, type LucideIcon } from 'lucide-react';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import { requestAttach, type AttachKind, type RichSend } from '@/entities/message';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';

interface AttachMenuProps {
  chatId: EntityId;
  disabled: boolean;
  title?: string;
  onPickFile: () => void;
  onSendRich?: (send: RichSend) => void;
}

const ITEMS: { kind: AttachKind; icon: LucideIcon }[] = [
  { kind: 'poll', icon: ListChecks },
  { kind: 'location', icon: MapPin },
  { kind: 'contact', icon: Contact },
];

const PaperclipButton = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<'button'>>((props, ref) => (
  <button ref={ref} type="button" {...props}
    className="motion-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50">
    <Paperclip className="h-5 w-5" />
  </button>
));
PaperclipButton.displayName = 'PaperclipButton';

const AttachItems = ({ chatId, onPickFile, onSendRich }: Pick<AttachMenuProps, 'chatId' | 'onPickFile'> & { onSendRich: (send: RichSend) => void }) => {
  const { translations } = useLanguage();
  const t = translations.attachMenu;
  return (
    <>
      <DropdownMenuItem onSelect={onPickFile}>
        <FileImage className="mr-2 h-4 w-4" aria-hidden="true" />{t.file}
      </DropdownMenuItem>
      {ITEMS.map(({ kind, icon: Icon }) => (
        <DropdownMenuItem key={kind} onSelect={() => requestAttach({ kind, chatId, onSend: onSendRich })}>
          <Icon className="mr-2 h-4 w-4" aria-hidden="true" />{t[kind]}
        </DropdownMenuItem>
      ))}
    </>
  );
};

export const AttachMenu = ({ chatId, disabled, title, onPickFile, onSendRich }: AttachMenuProps) => {
  const { translations } = useLanguage();
  const label = translations.attachFile || 'Attach file';
  if (!onSendRich) return <PaperclipButton aria-label={label} title={title} disabled={disabled} onClick={onPickFile} />;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <PaperclipButton aria-label={label} title={title} disabled={disabled} data-testid="attach-menu-button" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={8} className="min-w-[12rem]">
        <AttachItems chatId={chatId} onPickFile={onPickFile} onSendRich={onSendRich} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
