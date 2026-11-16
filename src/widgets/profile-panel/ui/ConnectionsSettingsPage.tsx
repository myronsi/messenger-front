import { useCallback, useState } from 'react';
import { Link2, Loader2, Plus } from 'lucide-react';
import { useSettingsLayout } from '../model/settingsLayout';
import { useConnectionResult } from '../model/useConnectionResult';
import { PageBackHeader } from '@/shared/ui/PageBackHeader';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/shared/ui/breadcrumb';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { toast } from '@/shared/ui/sonner';
import {
  isCodeProvider, moveItem, providerName, ProviderIcon, useDeleteConnectionMutation, useGetConnectionProvidersQuery,
  useGetMyConnectionsQuery, useReorderConnectionsMutation, useStartConnectionMutation, type Connection, type ConnectionProvider,
} from '@/features/connections';
import ConnectionRow from './ConnectionRow';
import ConnectionVerifyDialog from './ConnectionVerifyDialog';

const MAX_CONNECTIONS = 15;

interface Props {
  isActive: boolean;
  onBack: () => void;
  navigate?: (url: string) => void;
}

const goTo = (url: string) => window.location.assign(url);

export default function ConnectionsSettingsPage({ isActive, onBack, navigate = goTo }: Props) {
  const pane = useSettingsLayout() === 'pane';
  const { translations } = useLanguage();
  const t = translations.connections;
  const connections = useGetMyConnectionsQuery(undefined, { skip: !isActive });
  const providers = useGetConnectionProvidersQuery(undefined, { skip: !isActive }).data ?? [];
  const [reorder, { isLoading: reordering }] = useReorderConnectionsMutation();
  const [remove, { isLoading: removing }] = useDeleteConnectionMutation();
  const [start, { isLoading: starting }] = useStartConnectionMutation();
  const [verifying, setVerifying] = useState<ConnectionProvider | null>(null);
  const [confirm, setConfirm] = useState<Connection | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const items = connections.data ?? [];
  const busy = reordering || removing || starting;
  const full = items.length >= MAX_CONNECTIONS;
  const refetch = connections.refetch;
  const refresh = useCallback(() => { if (isActive) void refetch(); }, [isActive, refetch]);
  useConnectionResult(isActive, t, refresh);

  const move = (from: number, to: number) => {
    const next = moveItem(items, from, to);
    if (next.every((item, index) => item.id === items[index]?.id)) return;
    void reorder(next.map((item) => item.id)).unwrap().catch(() => toast.error(t.actionFailed));
  };
  const add = async (provider: ConnectionProvider) => {
    if (isCodeProvider(provider)) {
      setVerifying(provider);
      return;
    }
    try {
      navigate(await start(provider).unwrap());
    } catch {
      toast.error(fillTemplate(t.resultFailed, { provider: providerName(provider) }));
    }
  };
  const confirmRemove = async () => {
    if (!confirm) return;
    const target = confirm;
    setConfirm(null);
    try {
      await remove(target.id).unwrap();
      toast(t.removed);
    } catch {
      toast.error(t.actionFailed);
    }
  };

  return (
    <section className="flex h-full flex-col bg-background" data-testid="connections-settings">
      <PageBackHeader onBack={onBack} hideBack={pane}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbPage className="inline-flex items-center gap-2 font-medium"><Link2 className="h-4 w-4 text-muted-foreground" />{t.title}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </PageBackHeader>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <p className="text-sm text-muted-foreground">{t.description}</p>
        {connections.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{translations.loading}</div>
        ) : connections.isError ? (
          <p className="text-sm text-destructive">{t.loadFailed}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.empty}</p>
        ) : (
          <div className="space-y-2">
            <ul className="space-y-2" aria-label={t.connected}>
              {items.map((connection, index) => (
                <ConnectionRow key={connection.id} connection={connection} index={index} count={items.length} busy={busy}
                  dragging={dragFrom === index} onMove={move} onDragStart={setDragFrom} onRemove={setConfirm}
                  onDrop={(to) => { if (dragFrom !== null) move(dragFrom, to); setDragFrom(null); }} />
              ))}
            </ul>
            {items.length > 1 && <p className="text-xs text-muted-foreground">{t.dragHint}</p>}
          </div>
        )}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">{t.add}</h3>
          {full && <p className="text-xs text-muted-foreground">{t.limit}</p>}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {providers.map((provider) => (
              <button key={provider} type="button" disabled={busy || full} onClick={() => void add(provider)}
                className="motion-press flex items-center gap-2 rounded-md border border-border px-2 py-2 text-left text-sm transition-colors hover:bg-accent disabled:opacity-50">
                <ProviderIcon provider={provider} className="h-7 w-7" />
                <span className="min-w-0 flex-1 truncate">{providerName(provider)}</span>
                <Plus className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      </div>
      <ConnectionVerifyDialog provider={verifying} onClose={() => setVerifying(null)}
        onConnected={(provider) => toast.success(fillTemplate(t.resultConnected, { provider: providerName(provider) }))} />
      {confirm && (
        <ConfirmModal title={t.remove} message={fillTemplate(t.removeConfirm, { name: confirm.display_name })} isDestructive
          confirmText={t.remove} onConfirm={() => void confirmRemove()} onCancel={() => setConfirm(null)} />
      )}
    </section>
  );
}
