import { useSyncExternalStore } from 'react';
import { realtime } from '@/shared/api/realtime';
import { useLanguage } from '@/shared/contexts/LanguageContext';

export const ConnectionIndicator = () => {
  const status = useSyncExternalStore(realtime.subscribeStatus, realtime.getStatus, realtime.getStatus);
  const { language } = useLanguage();
  if (!['connecting', 'reconnecting', 'rejected'].includes(status)) return null;
  const message = status === 'rejected'
    ? language === 'ru' ? 'Соединение прервано. Обновите страницу.' : 'Connection ended. Reload to reconnect.'
    : language === 'ru' ? 'Повторное подключение…' : 'Reconnecting…';
  return <div role="status" aria-live="polite" className="fixed left-1/2 top-2 z-[100] -translate-x-1/2 rounded-full bg-background px-4 py-2 text-sm shadow">
    {message}
  </div>;
};
