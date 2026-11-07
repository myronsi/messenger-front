import React from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { Switch } from '@/shared/ui/switch';
import { setCodeVerified } from '../model/callControls';
import type { CallSession } from '../model/stores';
import { useUserName } from './callHooks';

interface SecurityCodePanelProps {
  session: CallSession;
  compact?: boolean;
}

const KeyChangeNotice: React.FC<{ userId: string }> = ({ userId }) => {
  const { translations } = useLanguage();
  const name = useUserName(userId);
  return (
    <p role="alert" className="flex gap-2 rounded-lg bg-amber-50 p-2 text-amber-900">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {fillTemplate(translations.callKeyChanged, { name: name || userId })}
    </p>
  );
};

const SecurityCodePanel: React.FC<SecurityCodePanelProps> = ({ session, compact = false }) => {
  const { translations } = useLanguage();
  const switchId = 'call-security-code-verified';
  const warnings = session.keyChanges.map((userId) => <KeyChangeNotice key={userId} userId={userId} />);
  if (compact) return <div className="space-y-2 text-sm">{warnings}</div>;
  return (
    <section aria-label={translations.callSecurityCode} className="space-y-3 rounded-xl border border-border bg-muted/40 p-3 text-sm">
      {warnings}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{translations.callSecurityCode}</p>
        {session.code ? (
          <p data-testid="call-security-code" className="mt-1 grid grid-cols-3 gap-x-3 gap-y-1 font-mono text-lg tracking-wider">
            {session.code.groups.map((group, index) => <span key={`${index}-${group}`}>{group}</span>)}
          </p>
        ) : (
          <p className="mt-1 text-muted-foreground">{translations.callEncryptionPending}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <label htmlFor={switchId} className="flex min-w-0 flex-1 items-center gap-2 font-medium">
          {session.verified && <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />}
          {session.verified ? translations.callVerified : translations.callMarkVerified}
        </label>
        <Switch id={switchId} checked={session.verified} disabled={!session.code} onCheckedChange={setCodeVerified} />
      </div>
      <p className="text-muted-foreground">{translations.callSecurityHelp}</p>
      <p className="text-muted-foreground">{translations.callSecurityResets}</p>
      <p className="text-muted-foreground">{translations.callSecurityLimits}</p>
    </section>
  );
};

export default SecurityCodePanel;
