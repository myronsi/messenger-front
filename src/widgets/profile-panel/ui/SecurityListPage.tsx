import { useState } from 'react';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { QrScannerDialog } from '@/features/auth';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { SecurityDetail } from '@/shared/lib/urlOverlay';
import { recoveryDetails, type RecoveryOverview } from '../model/recoveryMethods';
import { securitySummaries } from '../model/securitySummaries';
import { RecoveryOverviewCard } from './RecoveryOverviewCard';
import { SecurityActivity } from './SecurityActivity';
import { SecurityNavRow, SecuritySection } from './SecuritySection';
import { SessionDurationRow } from './SessionsSection';
import type { useSecuritySettings } from './useSecuritySettings';

type Settings = ReturnType<typeof useSecuritySettings>;

export const SecurityListPage = ({ settings, overview, onOpen }: {
  settings: Settings; overview?: RecoveryOverview; onOpen: (detail: SecurityDetail) => void;
}) => {
  const { language } = useLanguage();
  const [scanning, setScanning] = useState(false);
  const { translations, securityPage: t, securitySettings, sessionsData, isRevokingOthers, handleRevokeOtherSessions } = settings;
  const summary = securitySummaries({
    overview, labels: t,
    twoFactorEnabled: securitySettings ? Boolean(securitySettings.two_factor_enabled) : undefined,
    sessionCount: sessionsData?.sessions?.length,
    formatDate: value => new Date(value).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
  });
  const row = (detail: SecurityDetail, label: string) => <SecurityNavRow key={detail} label={label} summary={summary[detail]} onClick={() => onOpen(detail)} />;
  return <>
    <p className="text-sm text-muted-foreground">{t.pageDescription}</p>
    <RecoveryOverviewCard canAddPasskey={browserSupportsWebAuthn()} onAction={method => onOpen(recoveryDetails[method])} />
    <SecuritySection id="security-sign-in" title={t.signInTitle} description={t.signInDescription}>
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
      <SecurityNavRow label={translations.qrLogin.scanEntry} summary={translations.qrLogin.scanEntrySummary} onClick={() => setScanning(true)} />
      <SessionDurationRow settings={settings} />
    </SecuritySection>
    <SecurityActivity onSignOutOthers={() => { void handleRevokeOtherSessions(); }} signingOutOthers={isRevokingOthers}
      signOutLabel={translations.signOutOtherDevices} />
    <QrScannerDialog open={scanning} onClose={() => setScanning(false)} />
  </>;
};
