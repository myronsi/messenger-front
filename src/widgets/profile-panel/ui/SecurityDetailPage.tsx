import type { ReactNode } from 'react';
import type { SecurityDetail } from '@/shared/lib/urlOverlay';
import type { RecoveryOverview } from '../model/recoveryMethods';
import { PasskeySettings } from './PasskeySettings';
import { RecoveryEmailSettings } from './RecoveryEmailSettings';
import { RecoveryKeySettings, type CreatedRecoveryKey } from './RecoveryKeySettings';
import { SessionsList } from './SessionsSection';
import { PasswordRow, TwoFactorRow } from './SignInRows';
import type { useSecuritySettings } from './useSecuritySettings';

type Settings = ReturnType<typeof useSecuritySettings>;

const card = (content: ReactNode) => <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">{content}</div>;

export const SecurityDetailPage = ({ detail, settings, overview, onDismissSafetyChange, onRecoveryKeyCreated }: {
  detail: SecurityDetail; settings: Settings; overview?: RecoveryOverview; onDismissSafetyChange: (blocked: boolean) => void;
  onRecoveryKeyCreated?: (created: CreatedRecoveryKey) => void;
}) => {
  const locked = !overview || Boolean(overview.recovery_key.locked_until && Date.parse(overview.recovery_key.locked_until) > Date.now());
  if (detail === 'sessions') return <SessionsList settings={settings} />;
  if (detail === 'password') return card(<PasswordRow settings={settings} />);
  if (detail === 'two-factor') return card(<TwoFactorRow settings={settings} />);
  if (detail === 'passkeys') return card(<PasskeySettings locked={locked} enabled={Boolean(overview?.passkeys_enabled)} overview={overview} />);
  if (detail === 'recovery-key') return card(<RecoveryKeySettings onDismissSafetyChange={onDismissSafetyChange} onCreated={onRecoveryKeyCreated} />);
  return card(<RecoveryEmailSettings locked={locked} enabled={Boolean(overview?.email.enabled)} />);
};
