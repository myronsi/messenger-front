import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { ActionDialog } from '@/shared/ui/ActionDialog';
import { requestPollClose, submitPollClose, usePollCloseRequest } from '../model/pollActions';

export const PollCloseHost = () => {
  const { translations } = useLanguage();
  const t = translations.polls;
  const target = usePollCloseRequest();
  const [busy, setBusy] = useState(false);
  if (!target) return null;
  const confirm = async () => {
    setBusy(true);
    await submitPollClose(target, t);
    setBusy(false);
    requestPollClose(null);
  };
  return (
    <ActionDialog icon={<Lock />} title={t.closeTitle} points={[t.closeHint]} confirmText={t.closePoll} cancelText={t.cancel}
      busy={busy} onConfirm={() => void confirm()} onCancel={() => requestPollClose(null)} />
  );
};
