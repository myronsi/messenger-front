import { fillTemplate } from '@/shared/lib/fillTemplate';
import type { SecurityDetail } from '@/shared/lib/urlOverlay';
import type { RecoveryOverview } from './recoveryMethods';

type SummaryLabels = Record<'twoFactorOn' | 'twoFactorOff' | 'passkeysCount' | 'notAdded' | 'keyCreatedTile' | 'keySetUp' | 'methodMissing'
  | 'emailVerified' | 'emailPendingShort' | 'unavailable' | 'sessionsCount', string>;

export const securitySummaries = ({ overview, twoFactorEnabled, sessionCount, labels, formatDate }: {
  overview?: RecoveryOverview; twoFactorEnabled?: boolean; sessionCount?: number; labels: SummaryLabels; formatDate: (value: string) => string;
}): Record<SecurityDetail, string> => {
  const key = overview?.recovery_key;
  const email = overview?.email;
  return {
    password: '',
    'two-factor': twoFactorEnabled === undefined ? '' : twoFactorEnabled ? labels.twoFactorOn : labels.twoFactorOff,
    passkeys: !overview ? '' : !overview.passkeys_enabled ? labels.unavailable
      : overview.passkeys > 0 ? fillTemplate(labels.passkeysCount, { count: String(overview.passkeys) }) : labels.notAdded,
    'recovery-key': !key ? '' : !key.exists ? labels.methodMissing
      : key.created_at ? fillTemplate(labels.keyCreatedTile, { date: formatDate(key.created_at) }) : labels.keySetUp,
    'recovery-email': !email ? '' : !email.enabled ? labels.unavailable
      : email.state === 'verified' ? labels.emailVerified : email.state === 'pending' ? labels.emailPendingShort : labels.notAdded,
    sessions: sessionCount === undefined ? '' : fillTemplate(labels.sessionsCount, { count: String(sessionCount) }),
  };
};

type TitleLabels = {
  twoFactorAuthentication: string; activeSessions: string; securityPage: Record<'passwordTitle' | 'passkeysTitle' | 'keyTitle' | 'emailTitle', string>;
};

export const securityDetailTitle = (detail: SecurityDetail, { twoFactorAuthentication, activeSessions, securityPage: t }: TitleLabels) => ({
  password: t.passwordTitle,
  'two-factor': twoFactorAuthentication,
  passkeys: t.passkeysTitle,
  'recovery-key': t.keyTitle,
  'recovery-email': t.emailTitle,
  sessions: activeSessions,
})[detail];
