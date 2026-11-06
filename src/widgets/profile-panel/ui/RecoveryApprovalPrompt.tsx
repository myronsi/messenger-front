import { useEffect, useRef, useState } from 'react';
import type { ServerRecoveryRequestEvent } from '@myronsi/messenger-api';
import { useUrlOverlay } from '@/shared/lib/useUrlOverlay';
import { realtime } from '@/shared/api/realtime';
import { apiClient } from '@/shared/api/client';
import { deviceLabel } from '@/shared/lib/deviceLabel';
import { useGetSecuritySettingsQuery } from '@/features/profile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { toast } from '@/shared/ui/sonner';

type Notice = ServerRecoveryRequestEvent['data'];

export const RecoveryApprovalPrompt = () => {
  const [notice, setNotice] = useState<Notice | null>(null);
  const current = useRef<Notice | null>(null);
  const [choice, setChoice] = useState<number | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { open } = useUrlOverlay();
  const { data: security, isError: securityFailed } = useGetSecuritySettingsQuery(undefined, { skip: !notice });
  const showCode = securityFailed || Boolean(security?.two_factor_enabled);
  const codeRequired = Boolean(security?.two_factor_enabled) && !code;
  const device = notice?.user_agent ? deviceLabel(notice.user_agent) : 'an unknown device';

  useEffect(() => realtime.subscribe({ onEvent: frame => {
    if (frame.type !== 'recovery_request' || Date.parse(frame.data.expires_at) <= Date.now()) return;
    const previous = current.current;
    if (previous?.request_id === frame.data.request_id) return;
    if (previous) void apiClient.POST('/auth/recovery-requests/{requestId}/deny', {
      params: { path: { requestId: previous.request_id } },
    }).catch(() => {});
    current.current = frame.data;
    setNotice(frame.data); setChoice(null); setCode(''); setError('');
  } }), []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => { current.current = null; setNotice(null); setCode(''); },
      Math.max(0, Date.parse(notice.expires_at) - Date.now()));
    return () => clearTimeout(timer);
  }, [notice]);

  const decide = async (deny: boolean) => {
    if (!notice) return;
    setBusy(true); setError('');
    const requestId = notice.request_id;
    try {
      const response = deny ? await apiClient.POST('/auth/recovery-requests/{requestId}/deny', { params: { path: { requestId } } })
        : await apiClient.POST('/auth/recovery-requests/{requestId}/approve', {
          params: { path: { requestId } }, body: { match_number: choice!, code },
        });
      if (response.error) throw new Error();
      if (current.current?.request_id !== requestId) return;
      const denied = response.data?.status === 'denied';
      toast(denied ? 'Recovery request denied. Review your active sessions if this was unexpected.' : 'Recovery approved on your other device.', {
        action: denied ? { label: 'Review sessions', onClick: () => open({ kind: 'settings', page: 'security' }) } : undefined,
      });
      current.current = null; setNotice(null); setCode('');
    } catch { if (current.current?.request_id === requestId) setError('Unable to respond. Check your authentication code or try again.'); }
    finally { setBusy(false); }
  };

  return <Dialog open={Boolean(notice)}><DialogContent hideClose onEscapeKeyDown={event => event.preventDefault()}
    onPointerDownOutside={event => event.preventDefault()}>
    <DialogHeader><DialogTitle>Approve account recovery?</DialogTitle>
      <DialogDescription>Someone wants to reset your password on {device}{notice?.ip_hint ? ` (${notice.ip_hint})` : ''}.
        Only approve if you started this request. Choose the number shown on your other device.</DialogDescription></DialogHeader>
    <div className="flex justify-center gap-4" role="group" aria-label="Recovery match number">
      {notice?.choices.map(number => <Button key={number} variant={choice === number ? 'default' : 'outline'}
        aria-label={`Choose ${number}`} aria-pressed={choice === number} onClick={() => setChoice(number)}>{number}</Button>)}
    </div>
    {showCode && <><Label htmlFor="approval-code">Authenticator or backup code</Label>
      <Input id="approval-code" autoComplete="one-time-code" maxLength={128} value={code} onChange={event => setCode(event.target.value)} /></>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button disabled={busy || choice === null || (!security && !securityFailed) || codeRequired} onClick={() => { void decide(false); }}>Approve</Button>
    <Button variant="destructive" disabled={busy} onClick={() => { void decide(true); }}>This wasn’t me</Button>
  </DialogContent></Dialog>;
};
