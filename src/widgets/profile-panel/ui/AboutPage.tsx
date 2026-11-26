import React, { useMemo } from 'react';
import { Copy, Info, Monitor, Server } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/shared/ui/breadcrumb';
import { PageBackHeader } from '@/shared/ui/PageBackHeader';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useGetServerVersionQuery } from '@/shared/api/versionApi';
import { getApiBaseUrl } from '@/shared/api/config';
import { copyText } from '@/shared/lib/copyText';
import { toast } from '@/shared/ui/sonner';
import { LANGUAGE_NAMES } from '@/shared/lang/languages';
import { useSettingsLayout } from '../model/settingsLayout';
import { clientInfoRows, clientInfoText, readEnvironment } from '../model/clientInfo';

const InfoSection = ({ title, icon, action, rows }: { title: string; icon: React.ReactNode; action?: React.ReactNode; rows: [string, string][] }) => (
  <section className="overflow-hidden rounded-lg border border-border bg-card">
    <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
      <span className="text-muted-foreground">{icon}</span>
      <h3 className="flex-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
      {action}
    </div>
    <dl className="divide-y divide-border">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-4 px-4 py-2.5 text-sm">
          <dt className="shrink-0 text-muted-foreground">{label}</dt>
          <dd className="min-w-0 select-text break-all text-right font-mono text-[13px] text-foreground">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  </section>
);

const AboutPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { translations, language } = useLanguage();
  const t = translations.appShell.aboutInfo;
  const pane = useSettingsLayout() === 'pane';
  const { data, isLoading } = useGetServerVersionQuery();
  const unknown = isLoading ? '…' : '—';
  const client = useMemo(() => clientInfoRows(readEnvironment(), LANGUAGE_NAMES[language] ?? language, t), [language, t]);
  const address = (() => {
    try { return new URL(String(getApiBaseUrl() ?? ''), window.location.origin).host; } catch { return '—'; }
  })();
  const server: [string, string][] = [
    [t.serverRows.version, data?.serverVersion ?? unknown],
    [t.serverRows.commit, data?.commit ?? unknown],
    [t.serverRows.apiVersion, data?.apiVersion ?? unknown],
    [t.serverRows.minClientApi, data?.minClientApiVersion ?? unknown],
    [t.serverRows.address, address],
  ];
  const copyClient = () => void copyText(clientInfoText(client, t.rows)).then((ok) => toast(ok ? t.copied : t.copyFailed));

  return (
    <div className="flex h-full flex-col bg-background">
      <PageBackHeader onBack={onBack} hideBack={pane}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbPage className="inline-flex items-center gap-2 font-medium">
              <Info className="h-4 w-4 text-muted-foreground" />{translations.about}
            </BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </PageBackHeader>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <InfoSection title={t.client} icon={<Monitor className="h-4 w-4" />} rows={client.map(([key, value]) => [t.rows[key], value])}
          action={(
            <button type="button" onClick={copyClient} data-testid="copy-client-info"
              className="motion-press -my-1 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-accent">
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />{t.copy}
            </button>
          )} />
        <InfoSection title={t.server} icon={<Server className="h-4 w-4" />} rows={server} />
      </div>
    </div>
  );
};

export default AboutPage;
