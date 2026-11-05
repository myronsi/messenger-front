import { useEffect } from 'react';
import { realtime } from '@/shared/api/realtime';
import { useUrlOverlay } from '@/shared/lib/useUrlOverlay';
import { deviceLabel } from '@/shared/lib/deviceLabel';
import { toast } from '@/shared/ui/sonner';
import { useAppDispatch } from '@/shared/hooks/redux';
import { recoveryApi } from '@/features/profile';

const labels: Record<string, string> = {
  password_changed: 'Your password was changed', recovery_key_changed: 'Your recovery key was changed',
  '2fa_enabled': 'Two-factor authentication was enabled', '2fa_disabled': 'Two-factor authentication was disabled',
  passkey_added: 'A passkey was added', passkey_removed: 'A passkey was removed',
  recovery_email_changed: 'Your recovery email was changed', recovery_email_removed: 'Your recovery email was removed',
  passkey_counter_warning: 'A passkey failed a security check', login: 'New sign-in', passkey_login: 'New passkey sign-in',
};
export const SecurityNoticeHandler = () => {
  const { open } = useUrlOverlay();
  const dispatch = useAppDispatch();
  useEffect(() => realtime.subscribe({ onEvent: event => {
    if (event.type !== 'security_notice' || event.data.type === 'password_reset') return;
    dispatch(recoveryApi.util.invalidateTags(['Auth']));
    toast(`${labels[event.data.type] || 'Account security updated'} on ${deviceLabel(event.data.user_agent)}. Wasn’t you?`, {
      id: `security:${event.event_id}`, duration: 12_000,
      action: { label: 'Review sessions', onClick: () => open({ kind: 'settings', page: 'security' }) },
    });
  } }), [dispatch, open]);
  return null;
};
