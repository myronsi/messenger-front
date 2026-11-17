import { ArrowDown, ArrowUp, ExternalLink, GripVertical, MoreHorizontal, Trash2 } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { localeOf } from '@/shared/lang/languages';
import { cn } from '@/shared/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { providerName, ProviderIcon, type Connection } from '@/features/connections';

interface Props {
  connection: Connection;
  index: number;
  count: number;
  busy: boolean;
  dragging: boolean;
  onMove: (from: number, to: number) => void;
  onDragStart: (index: number) => void;
  onDrop: (index: number) => void;
  onRemove: (connection: Connection) => void;
}

const verifiedDate = (value: string, language: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(localeOf(language), { day: 'numeric', month: 'short' });
};

export default function ConnectionRow({ connection, index, count, busy, dragging, onMove, onDragStart, onDrop, onRemove }: Props) {
  const { translations, language } = useLanguage();
  const t = translations.connections;
  const name = providerName(connection.provider);
  const date = verifiedDate(connection.verified_at, language);
  return (
    <li data-testid="connection-row" draggable={!busy} onDragStart={() => onDragStart(index)}
      onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); onDrop(index); }}
      className={cn('group flex items-center gap-3 px-3 py-2.5 transition-opacity', dragging && 'opacity-40')}>
      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground/60 transition-colors group-hover:text-muted-foreground max-sm:hidden"
        aria-hidden="true" />
      <ProviderIcon provider={connection.provider} className="h-10 w-10" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{connection.display_name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {[name, date && fillTemplate(t.verifiedOn, { date })].filter(Boolean).join(' · ')}
        </span>
      </span>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button type="button" disabled={busy} aria-label={fillTemplate(t.optionsFor, { name: connection.display_name })}
            className="motion-press flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          {connection.profile_url && (
            <DropdownMenuItem asChild>
              <a href={connection.profile_url} target="_blank" rel="noopener noreferrer" aria-label={fillTemplate(t.openProfile, { provider: name })}>
                <ExternalLink className="mr-2 h-4 w-4" />{fillTemplate(t.openProfile, { provider: name })}
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem disabled={index === 0} onSelect={() => onMove(index, index - 1)}>
            <ArrowUp className="mr-2 h-4 w-4" />{t.moveUp}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={index === count - 1} onSelect={() => onMove(index, index + 1)}>
            <ArrowDown className="mr-2 h-4 w-4" />{t.moveDown}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onRemove(connection)}>
            <Trash2 className="mr-2 h-4 w-4" />{t.remove}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
