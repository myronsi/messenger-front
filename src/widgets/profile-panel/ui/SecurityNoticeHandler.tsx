import { useEffect } from 'react';
import { realtime } from '@/shared/api/realtime';
import { useUrlOverlay } from '@/shared/lib/useUrlOverlay';
import { deviceLabel } from '@/shared/lib/deviceLabel';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { toast } from '@/shared/ui/sonner';
import { useAppDispatch } from '@/shared/hooks/redux';
import { recoveryApi } from '@/features/profile';

export const SecurityNoticeHandler = () => {
  const { open } = useUrlOverlay();
  const dispatch = useAppDispatch();
  const t = useLanguage().translations.securityPage;
  useEffect(() => realtime.subscribe({ onEvent: event => {
    if (event.type !== 'security_alert') return;
    dispatch(recoveryApi.util.invalidateTags(['Auth']));
    const label = (t.notices as Record<string, string>)[event.data.type] || t.eventFallback;
    toast(fillTemplate(t.noticeToast, { event: label, device: deviceLabel(event.data.user_agent) }), {
      id: `security:${event.event_id}`, duration: 12_000,
      action: { label: t.reviewSessions, onClick: () => open({ kind: 'settings', page: 'security', securityDetail: 'sessions' }) },
    });
  } }), [dispatch, open, t]);
  return null;
};
