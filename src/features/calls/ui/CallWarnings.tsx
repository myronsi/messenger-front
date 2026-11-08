import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import type { CallSession } from '../model/stores';
import { useUserName } from './callHooks';

const WARNING = 'flex gap-2 rounded-lg bg-warning-soft p-2 text-warning';

const KeyChangeNotice: React.FC<{ userId: string }> = ({ userId }) => {
  const { translations } = useLanguage();
  const name = useUserName(userId);
  return (
    <p role="alert" className={WARNING}>
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {fillTemplate(translations.callKeyChanged, { name: name || userId })}
    </p>
  );
};

const CallWarnings: React.FC<{ session: Pick<CallSession, 'encryption' | 'keyChanges'> }> = ({ session }) => {
  const { translations } = useLanguage();
  if (session.encryption !== 'failed' && session.keyChanges.length === 0) return null;
  return (
    <div data-testid="call-warnings" className="space-y-2 border-b border-border px-4 py-2 text-sm">
      {session.encryption === 'failed' && (
        <p role="alert" className={WARNING}>
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {translations.callEncryptionFailed}
        </p>
      )}
      {session.keyChanges.map((userId) => <KeyChangeNotice key={userId} userId={userId} />)}
    </div>
  );
};

export default CallWarnings;
