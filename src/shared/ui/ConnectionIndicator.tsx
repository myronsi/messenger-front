import { useSyncExternalStore } from 'react';
import { realtime } from '@/shared/api/realtime';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { shouldShowConnectionNotice } from '@/shared/lib/connectionNotice';

export const ConnectionIndicator = () => {
  const status = useSyncExternalStore(realtime.subscribeStatus, realtime.getStatus, realtime.getStatus);
  const { translations } = useLanguage();
  if (!shouldShowConnectionNotice(status, realtime.hasOpened())) return null;
  const message = status === 'rejected' ? translations.connectionEnded : translations.reconnecting;
  return <div role="status" aria-live="polite" className="fixed left-1/2 top-2 z-[100] -translate-x-1/2 rounded-full bg-background px-4 py-2 text-sm shadow">
    {message}
  </div>;
};
