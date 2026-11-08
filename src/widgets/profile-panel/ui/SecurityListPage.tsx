import { useState } from 'react';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { QrScannerDialog } from '@/features/auth';
import { useCanScanQr } from '@/shared/hooks/useCanScanQr';
import { useGetSecurityActivityQuery } from '@/features/profile';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { SecurityDetail } from '@/shared/lib/urlOverlay';
import { recoveryDetails, recoveryMethods, type RecoveryOverview } from '../model/recoveryMethods';
import { securitySummaries } from '../model/securitySummaries';
import { RecoveryOverviewCard } from './RecoveryOverviewCard';
import { SecurityNavRow, SecuritySection } from './SecuritySection';
import { SessionDurationRow } from './SessionsSection';
import type { useSecuritySettings } from './useSecuritySettings';
import { localeOf } from '@/shared/lang/languages';

type Settings = ReturnType<typeof useSecuritySettings>;

export const SecurityListPage = ({ settings, overview, keySavingUnconfirmed, onOpen }: {
  settings: Settings; overview?: RecoveryOverview; keySavingUnconfirmed: boolean; onOpen: (detail: SecurityDetail) => void;
}) => {
  const { language } = useLanguage();
  const [scanning, setScanning] = useState(false);
  const canScanQr = useCanScanQr();
  const { translations, securityPage: t, securitySettings, sessionsData } = settings;
  const { data: activity } = useGetSecurityActivityQuery();
  const latest = activity?.[0];
  const events = t.events as Record<string, string>;
  const summary = securitySummaries({
    overview, labels: t,
    twoFactorEnabled: securitySettings ? Boolean(securitySettings.two_factor_enabled) : undefined,
    sessionCount: sessionsData?.sessions?.length,
    latestActivity: latest && (events[latest.type] || t.eventFallback),
    formatDate: value => new Date(value).toLocaleDateString(localeOf(language), { day: 'numeric', month: 'short', year: 'numeric' }),
  });
  const recovery = overview ? recoveryMethods(overview) : [];
  const statusOf = (detail: SecurityDetail) => {
    const method = recovery.find(item => recoveryDetails[item.id] === detail);
    return method && (method.active ? 'ready' as const : 'missing' as const);
  };
  const row = (detail: SecurityDetail, label: string) => {
    const unconfirmed = detail === 'recovery-key' && overview?.recovery_key.exists && keySavingUnconfirmed;
    const status = unconfirmed ? undefined : statusOf(detail);
    return <SecurityNavRow key={detail} label={label} summary={unconfirmed ? t.keySavingUnconfirmed : summary[detail]} status={status}
      statusLabel={status && `${t.recoveryTitle}: ${status === 'ready' ? t.methodReady : t.methodMissing}`} onClick={() => onOpen(detail)} />;
  };
  return <>
    <p className="text-sm text-muted-foreground">{t.pageDescription}</p>
    <RecoveryOverviewCard keySavingUnconfirmed={keySavingUnconfirmed} canAddPasskey={browserSupportsWebAuthn()}
      onAction={method => onOpen(recoveryDetails[method])} />
    <SecuritySection id="security-sign-in" title={t.signInTitle}>
      {row('password', t.passwordTitle)}
      {row('two-factor', translations.twoFactorAuthentication)}
      {row('passkeys', t.passkeysTitle)}
    </SecuritySection>
    <SecuritySection id="security-recovery" title={t.recoveryTitle} description={t.recoveryDescription}>
      {row('recovery-key', t.keyTitle)}
      {row('recovery-email', t.emailTitle)}
    </SecuritySection>
    <SecuritySection id="security-devices" title={t.devicesTitle} description={t.sessionsDescription}>
      {row('sessions', translations.activeSessions)}
      {row('activity', t.activityTitle)}
      {canScanQr && <SecurityNavRow label={translations.qrLogin.scanEntry} summary={translations.qrLogin.scanEntrySummary} onClick={() => setScanning(true)} />}
      <SessionDurationRow settings={settings} />
    </SecuritySection>
    <QrScannerDialog open={scanning} onClose={() => setScanning(false)} />
  </>;
};
