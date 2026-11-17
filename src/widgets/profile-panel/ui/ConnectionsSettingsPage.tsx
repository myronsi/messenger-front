import { useCallback, useState, type ReactNode } from 'react';
import { Check, Link2, Loader2 } from 'lucide-react';
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
import ConnectionChip from './ConnectionChip';
import ConnectionRow from './ConnectionRow';
import ConnectionVerifyDialog from './ConnectionVerifyDialog';

const MAX_CONNECTIONS = 15;

interface Props {
  isActive: boolean;
  onBack: () => void;
  navigate?: (url: string) => void;
}

const goTo = (url: string) => window.location.assign(url);

const Section = ({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) => (
  <section>
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {aside && <span className="text-xs tabular-nums text-muted-foreground">{aside}</span>}
    </div>
    {children}
  </section>
);

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
  const connectedProviders = new Set(items.map((item) => item.provider));
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
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <p className="text-sm text-muted-foreground">{t.description}</p>
        <Section title={t.previewTitle}>
          <div data-testid="connections-preview" className="rounded-2xl border border-border bg-muted/30 p-4">
            {items.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {items.map((connection) => <li key={connection.id} className="min-w-0 max-w-full"><ConnectionChip connection={connection} /></li>)}
              </ul>
            ) : <p className="text-sm text-muted-foreground">{t.previewEmpty}</p>}
          </div>
        </Section>
        <Section title={t.connected} aside={fillTemplate(t.countOf, { count: String(items.length), max: String(MAX_CONNECTIONS) })}>
          {connections.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{translations.loading}</div>
          ) : connections.isError ? (
            <p className="text-sm text-destructive">{t.loadFailed}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.empty}</p>
          ) : (
            <>
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border" aria-label={t.connected}>
                {items.map((connection, index) => (
                  <ConnectionRow key={connection.id} connection={connection} index={index} count={items.length} busy={busy}
                    dragging={dragFrom === index} onMove={move} onDragStart={setDragFrom} onRemove={setConfirm}
                    onDrop={(to) => { if (dragFrom !== null) move(dragFrom, to); setDragFrom(null); }} />
                ))}
              </ul>
              {items.length > 1 && <p className="mt-2 text-xs text-muted-foreground max-sm:hidden">{t.dragHint}</p>}
            </>
          )}
        </Section>
        <Section title={t.add}>
          {full && <p className="mb-2 text-xs text-muted-foreground">{t.limit}</p>}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {providers.map((provider) => {
              const linked = connectedProviders.has(provider);
              return (
                <button key={provider} type="button" disabled={busy || full} onClick={() => void add(provider)}
                  className="motion-press relative flex flex-col items-center gap-2 rounded-2xl border border-border px-2 py-3 text-center transition-colors hover:bg-accent disabled:opacity-50">
                  <ProviderIcon provider={provider} className="h-11 w-11" />
                  <span className="w-full truncate text-xs font-medium">{providerName(provider)}</span>
                  {linked && (
                    <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" aria-hidden="true" /><span className="sr-only">{t.alreadyConnected}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Section>
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
