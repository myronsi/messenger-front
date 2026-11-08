import React, { useEffect, useState } from 'react';
import { DeleteAccountZone } from './DeleteAccountZone';
import { useSettingsLayout } from '../model/settingsLayout';
import { PageBackHeader } from '@/shared/ui/PageBackHeader';
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
import { RecoveryKeyReceipt } from '@/shared/ui/RecoveryKeyReceipt';
import type { CreatedRecoveryKey } from './RecoveryKeySettings';

interface SecuritySettingsPanelProps {
  isActive: boolean;
  username?: string;
  detail?: SecurityDetail;
  onOpenDetail: (detail: SecurityDetail | null) => void;
  onBack: () => void;
  onLoggedOut: () => void;
  onDismissSafetyChange: (blocked: boolean) => void;
  onDeleteAccount: () => void;
  isDeletingAccount: boolean;
}

const SecuritySettingsPanel: React.FC<SecuritySettingsPanelProps> = ({
  isActive, username, detail, onOpenDetail, onBack, onLoggedOut, onDismissSafetyChange, onDeleteAccount, isDeletingAccount,
}) => {
  const settings = useSecuritySettings(isActive, onLoggedOut);
  const pane = useSettingsLayout() === 'pane';
  const { translations, status } = settings;
  const { data: overview } = useGetRecoveryOverviewQuery(undefined, { skip: !isActive });
  const [createdKey, setCreatedKey] = useState<CreatedRecoveryKey | null>(null);
  const keySavingUnconfirmed = Boolean(username && localStorage.getItem(`recovery_receipt_skipped:${username}`) === 'true');
  const hasCreatedKey = Boolean(createdKey);
  useEffect(() => { if (hasCreatedKey) onDismissSafetyChange(true); }, [hasCreatedKey, onDismissSafetyChange]);
  const finishCreatedKey = () => { setCreatedKey(null); onDismissSafetyChange(false); };
  const crumb = (label: React.ReactNode, onClick?: () => void) => (
    <BreadcrumbItem>
      {onClick
        ? <BreadcrumbLink asChild className="cursor-pointer"><button type="button" onClick={onClick} className="inline-flex items-center gap-2">{label}</button></BreadcrumbLink>
        : <BreadcrumbPage className="inline-flex items-center gap-2 font-medium">{label}</BreadcrumbPage>}
    </BreadcrumbItem>
  );
  const securityLabel = <><Smartphone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />{translations.securityDevices || 'Security & devices'}</>;

  return (
    <div className="relative flex h-full flex-col bg-background">
      <PageBackHeader onBack={detail ? () => onOpenDetail(null) : onBack} hideBack={pane && !detail}>
        <Breadcrumb>
          <BreadcrumbList>
            {crumb(securityLabel, detail ? () => onOpenDetail(null) : undefined)}
            {detail && (
              <>
                <BreadcrumbSeparator />
                {crumb(securityDetailTitle(detail, translations))}
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </PageBackHeader>

      {status && (
        <div
          aria-live="polite"
          className={`pointer-events-none absolute right-4 top-[58px] z-10 inline-flex max-w-[min(18rem,calc(100%-2rem))] items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm ${
            status.type === 'success'
              ? 'border-success/30 bg-success-soft text-success'
              : 'border-destructive/30 bg-destructive-soft text-destructive'
          }`}
        >
          {status.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />}
          <span className="truncate">{status.text}</span>
        </div>
      )}

      <div key={detail ?? 'list'} className="motion-sheet-in min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="flex flex-col gap-5">
          {isActive && (createdKey
            ? <RecoveryKeyReceipt recoveryKey={createdKey.recoveryKey} username={createdKey.username} onContinue={finishCreatedKey} />
            : detail
              ? <SecurityDetailPage detail={detail} settings={settings} overview={overview} onDismissSafetyChange={onDismissSafetyChange}
                onRecoveryKeyCreated={setCreatedKey} />
              : <>
                <SecurityListPage keySavingUnconfirmed={keySavingUnconfirmed} settings={settings} overview={overview} onOpen={onOpenDetail} />
                <DeleteAccountZone onDelete={onDeleteAccount} isDeleting={isDeletingAccount} />
              </>)}
        </div>
      </div>
      {settings.twoFactorDialog}
    </div>
  );
};

export default SecuritySettingsPanel;
