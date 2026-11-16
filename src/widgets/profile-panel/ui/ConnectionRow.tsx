import { ChevronDown, ChevronUp, ExternalLink, GripVertical, Trash2 } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
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

const ICON_BUTTON = 'motion-press flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40';

export default function ConnectionRow({ connection, index, count, busy, dragging, onMove, onDragStart, onDrop, onRemove }: Props) {
  const { translations } = useLanguage();
  const t = translations.connections;
  const name = providerName(connection.provider);
  return (
    <li data-testid="connection-row" draggable={!busy} onDragStart={() => onDragStart(index)}
      onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); onDrop(index); }}
      className={`flex items-center gap-2 rounded-md border border-border bg-background px-2 py-2 ${dragging ? 'opacity-50' : ''}`}>
      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" aria-hidden="true" />
      <ProviderIcon provider={connection.provider} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{connection.display_name}</span>
        <span className="block truncate text-xs text-muted-foreground">{name}</span>
      </span>
      {connection.profile_url && (
        <a href={connection.profile_url} target="_blank" rel="noopener noreferrer" className={ICON_BUTTON}
          aria-label={fillTemplate(t.openProfile, { provider: name })}>
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
      <button type="button" className={ICON_BUTTON} disabled={busy || index === 0} aria-label={t.moveUp} onClick={() => onMove(index, index - 1)}>
        <ChevronUp className="h-4 w-4" />
      </button>
      <button type="button" className={ICON_BUTTON} disabled={busy || index === count - 1} aria-label={t.moveDown} onClick={() => onMove(index, index + 1)}>
        <ChevronDown className="h-4 w-4" />
      </button>
      <button type="button" className={`${ICON_BUTTON} hover:text-destructive`} disabled={busy} aria-label={`${t.remove} ${connection.display_name}`}
        onClick={() => onRemove(connection)}>
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}
