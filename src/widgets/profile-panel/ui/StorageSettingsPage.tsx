import React, { useCallback, useEffect, useState } from 'react';
import { Check, HardDrive, Trash2 } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { formatFileSize } from '@/shared/lib/formatFileSize';
import { clearMediaCache } from '@/shared/api/mediaCache';
import {
  STORAGE_CAPS, capBytes, clearOfflineData, enforceStorageCapSoon, getOfflineDb, setStorageCap, useStorageCap, type StorageCap,
} from '@/shared/offline';
import { ActionDialog } from '@/shared/ui/ActionDialog';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/shared/ui/breadcrumb';
import { Button } from '@/shared/ui/button';
import { PageBackHeader } from '@/shared/ui/PageBackHeader';
import { useSettingsLayout } from '../model/settingsLayout';

interface StorageSettingsPageProps {
  isActive: boolean;
  onBack: () => void;
}

type Usage = { messages: number; media: number; total: number } | null | undefined;

const StorageSettingsPage: React.FC<StorageSettingsPageProps> = ({ isActive, onBack }) => {
  const { translations, language } = useLanguage();
  const t = translations.offlineStorage;
  const pane = useSettingsLayout() === 'pane';
  const cap = useStorageCap();
  const [usage, setUsage] = useState<Usage>();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cleared, setCleared] = useState(false);
  const size = (bytes: number) => formatFileSize(bytes, language, translations);

  const refresh = useCallback(() => {
    void getOfflineDb().then((db) => (db ? db.usage() : null)).then(setUsage, () => setUsage(null));
  }, []);

  useEffect(() => {
    if (isActive) refresh();
  }, [isActive, refresh]);

  const choose = (next: StorageCap) => {
    setStorageCap(next);
    enforceStorageCapSoon();
  };

  const clear = async () => {
    setBusy(true);
    await clearOfflineData().catch(() => undefined);
    clearMediaCache();
    setBusy(false);
    setConfirming(false);
    setCleared(true);
    refresh();
  };

  const limit = capBytes(cap);
  return (
    <div className="flex h-full flex-col bg-background">
      <PageBackHeader onBack={onBack} hideBack={pane}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbPage className="inline-flex items-center gap-2 font-medium"><HardDrive className="h-4 w-4 text-muted-foreground" />{t.title}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </PageBackHeader>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <p className="text-sm text-muted-foreground">{t.description}</p>
        {usage === null ? <p className="text-sm text-muted-foreground">{t.unavailable}</p> : (
          <section aria-label={t.used} className="space-y-2 rounded-lg border border-border px-4 py-3" data-testid="offline-usage">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-foreground">{t.used}</span>
              <span className="text-sm tabular-nums text-foreground">{usage ? size(usage.total) : '…'}{limit !== null ? ` / ${size(limit)}` : ''}</span>
            </div>
            {limit !== null && usage && (
              <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (usage.total / limit) * 100)}%` }} />
              </div>
            )}
            <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <dt>{t.messages}</dt><dd className="tabular-nums">{usage ? size(usage.messages) : '…'}</dd>
              <dt>{t.media}</dt><dd className="tabular-nums">{usage ? size(usage.media) : '…'}</dd>
            </dl>
          </section>
        )}
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">{t.limit}</h3>
          <div role="radiogroup" aria-label={t.limit} className="overflow-hidden rounded-lg border border-border">
            {STORAGE_CAPS.map((option) => (
              <button key={option} type="button" role="radio" aria-checked={cap === option} onClick={() => { if (cap !== option) choose(option); }}
                className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left text-sm transition-colors last:border-b-0 hover:bg-accent/60">
                <span className="min-w-0 flex-1 font-medium text-foreground">{t.limits[option]}</span>
                {cap === option && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{t.limitHint}</p>
        </section>
        <div className="space-y-2">
          <Button type="button" variant="outline" className="w-full text-destructive" onClick={() => { setCleared(false); setConfirming(true); }}>
            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />{t.clear}
          </Button>
          {cleared && <p role="status" className="text-center text-sm text-muted-foreground">{t.cleared}</p>}
        </div>
      </div>
      {confirming && (
        <ActionDialog icon={<Trash2 />} title={t.clearTitle} points={[t.clearBody]} confirmText={t.clear} busy={busy}
          onConfirm={() => { void clear(); }} onCancel={() => setConfirming(false)} />
      )}
    </div>
  );
};

export default StorageSettingsPage;
