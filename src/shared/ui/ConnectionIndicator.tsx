import { useSyncExternalStore } from 'react';
import { realtime } from '@/shared/api/realtime';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { shouldShowConnectionNotice } from '@/shared/lib/connectionNotice';
import { useOffline } from '@/shared/lib/network';
import { CONNECTION_NOTICE_LAYER } from './layers';

export const ConnectionIndicator = () => {
  const status = useSyncExternalStore(realtime.subscribeStatus, realtime.getStatus, realtime.getStatus);
  const { translations } = useLanguage();
  const offline = useOffline();
  if (!offline && !shouldShowConnectionNotice(status, realtime.hasOpened())) return null;
  const message = offline ? translations.waitingForNetwork : status === 'rejected' ? translations.connectionEnded : translations.reconnecting;
  return <div role="status" aria-live="polite" className={`fixed left-1/2 top-2 ${CONNECTION_NOTICE_LAYER} -translate-x-1/2 whitespace-nowrap rounded-full bg-background px-4 py-2 text-sm shadow`}>
    {message}
  </div>;
};
