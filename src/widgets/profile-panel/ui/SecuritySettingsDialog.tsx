import React from 'react';
import { AlertCircle, CheckCircle2, Smartphone } from 'lucide-react';
import { useGetRecoveryOverviewQuery } from '@/features/profile';
import type { SecurityDetail } from '@/shared/lib/urlOverlay';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/ui/breadcrumb';
import { useSecuritySettings } from './useSecuritySettings';
import { securityDetailTitle } from '../model/securitySummaries';
import { SecurityDetailPage } from './SecurityDetailPage';
import { SecurityListPage } from './SecurityListPage';

interface SecuritySettingsPanelProps {
  isActive: boolean;
  detail?: SecurityDetail;
  onOpenDetail: (detail: SecurityDetail | null) => void;
  onBack: () => void;
  onLoggedOut: () => void;
  onDismissSafetyChange: (blocked: boolean) => void;
}

const SecuritySettingsPanel: React.FC<SecuritySettingsPanelProps> = ({ isActive, detail, onOpenDetail, onBack, onLoggedOut, onDismissSafetyChange }) => {
  const settings = useSecuritySettings(isActive, onLoggedOut);
  const { translations, status } = settings;
  const { data: overview } = useGetRecoveryOverviewQuery(undefined, { skip: !isActive });
  const crumb = (label: React.ReactNode, onClick?: () => void) => (
    <BreadcrumbItem>
      {onClick
        ? <BreadcrumbLink asChild className="cursor-pointer"><button type="button" onClick={onClick} className="inline-flex items-center gap-2">{label}</button></BreadcrumbLink>
        : <BreadcrumbPage className="inline-flex items-center gap-2 font-medium">{label}</BreadcrumbPage>}
    </BreadcrumbItem>
  );
  const securityLabel = <><Smartphone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />{translations.securityDevices || 'Security & devices'}</>;

  return (
    <div className="relative flex h-full flex-col bg-white">
      <div className="border-b border-border px-5 py-4">
        <Breadcrumb>
          <BreadcrumbList>
            {crumb(translations.profile || 'Profile', onBack)}
            <BreadcrumbSeparator />
            {crumb(translations.settings || 'Settings', onBack)}
            <BreadcrumbSeparator />
            {crumb(securityLabel, detail ? () => onOpenDetail(null) : undefined)}
            {detail && (
              <>
                <BreadcrumbSeparator />
                {crumb(securityDetailTitle(detail, translations))}
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {status && (
        <div
          aria-live="polite"
          className={`pointer-events-none absolute right-4 top-[58px] z-10 inline-flex max-w-[min(18rem,calc(100%-2rem))] items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm ${
            status.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {status.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />}
          <span className="truncate">{status.text}</span>
        </div>
      )}

      <div key={detail ?? 'list'} className="motion-sheet-in min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          {isActive && (detail
            ? <SecurityDetailPage detail={detail} settings={settings} overview={overview} onDismissSafetyChange={onDismissSafetyChange} />
            : <SecurityListPage settings={settings} overview={overview} onOpen={onOpenDetail} />)}
        </div>
      </div>
      {settings.twoFactorDialog}
    </div>
  );
};

export default SecuritySettingsPanel;
