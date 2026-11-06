import { useEffect, useRef, useState } from 'react';
import type { ServerRecoveryRequestEvent } from '@myronsi/messenger-api';
import { useUrlOverlay } from '@/shared/lib/useUrlOverlay';
import { realtime } from '@/shared/api/realtime';
import { apiClient } from '@/shared/api/client';
import { deviceLabel } from '@/shared/lib/deviceLabel';
import { locationLabel } from '@/shared/lib/locationLabel';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { cn } from '@/shared/lib/utils';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { ApiProblem } from '@/shared/api/problem';
import { isTwoFactorCancelled } from '@/shared/ui/useTwoFactorConfirm';
import { useAccountTwoFactor } from '../model/useAccountTwoFactor';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { toast } from '@/shared/ui/sonner';

type Notice = ServerRecoveryRequestEvent['data'];

const useSecondsSince = (since: number | null) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (since === null) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [since]);
  return since === null ? 0 : Math.max(0, Math.floor((now - since) / 1000));
};

export const RecoveryApprovalPrompt = () => {
  const { translations, language } = useLanguage();
  const t = translations.recoveryApproval;
  const [notice, setNotice] = useState<Notice | null>(null);
  const [receivedAt, setReceivedAt] = useState<number | null>(null);
  const current = useRef<Notice | null>(null);
  const [choice, setChoice] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { open } = useUrlOverlay();
  const twoFactor = useAccountTwoFactor();
  const device = notice?.user_agent ? deviceLabel(notice.user_agent) : t.unknownDevice;
  const place = locationLabel(notice?.location, language);
  const elapsed = useSecondsSince(notice ? receivedAt : null);
  const requested = elapsed < 5 ? t.requestedJustNow : elapsed < 60
    ? fillTemplate(t.requestedSecondsAgo, { count: String(elapsed) }) : fillTemplate(t.requestedMinutesAgo, { count: String(Math.floor(elapsed / 60)) });

  useEffect(() => realtime.subscribe({ onEvent: frame => {
    if (frame.type !== 'recovery_request' || Date.parse(frame.data.expires_at) <= Date.now()) return;
    const previous = current.current;
    if (previous?.request_id === frame.data.request_id) return;
    if (previous) void apiClient.POST('/auth/recovery-requests/{requestId}/deny', {
      params: { path: { requestId: previous.request_id } },
    }).catch(() => {});
    current.current = frame.data;
    setNotice(frame.data); setReceivedAt(Date.now()); setChoice(null); setError('');
  } }), []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => { current.current = null; setNotice(null); },
      Math.max(0, Date.parse(notice.expires_at) - Date.now()));
    return () => clearTimeout(timer);
  }, [notice]);

  const decide = async (deny: boolean) => {
    if (!notice) return;
    setBusy(true); setError('');
    const requestId = notice.request_id;
    try {
      const response = deny ? await apiClient.POST('/auth/recovery-requests/{requestId}/deny', { params: { path: { requestId } } })
        : await twoFactor.confirm(async code => {
          const result = await apiClient.POST('/auth/recovery-requests/{requestId}/approve', {
            params: { path: { requestId } }, body: { match_number: choice!, ...(code ? { code } : {}) },
          });
          if (result.error) throw new ApiProblem(result.response.status, result.error);
          return result;
        });
      if (response.error) throw new Error();
      if (current.current?.request_id !== requestId) return;
      const denied = response.data?.status === 'denied';
      toast(denied ? t.deniedToast : t.approvedToast, {
        action: denied ? { label: t.reviewSessions, onClick: () => open({ kind: 'settings', page: 'security', securityDetail: 'sessions' }) } : undefined,
      });
      current.current = null; setNotice(null);
    } catch (caught) { if (!isTwoFactorCancelled(caught) && current.current?.request_id === requestId) setError(t.failed); }
    finally { setBusy(false); }
  };

  return <Dialog open={Boolean(notice)}><DialogContent hideClose onEscapeKeyDown={event => event.preventDefault()}
    onPointerDownOutside={event => event.preventDefault()}
    className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-[440px] gap-[18px] overflow-y-auto rounded-2xl p-6 sm:rounded-2xl">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-amber-100 text-amber-700">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" /><path d="M12 8v4M12 16h.01" /></svg>
      </div>
      <div className="flex flex-col gap-1 text-left">
        <DialogTitle className="text-lg font-bold leading-snug">{t.title}</DialogTitle>
        <DialogDescription className="text-[13px] text-slate-600">{requested}</DialogDescription>
      </div>
    </div>
    <dl className="grid grid-cols-2 gap-2.5 rounded-[10px] border border-border bg-slate-50 px-3.5 py-3">
      <div className="min-w-0"><dt className="text-[11px] uppercase tracking-wide text-slate-500">{t.device}</dt>
        <dd className="mt-0.5 break-words text-sm font-medium">{device}</dd></div>
      <div className="min-w-0"><dt className="text-[11px] uppercase tracking-wide text-slate-500">{t.location}</dt>
        <dd className="mt-0.5 break-words text-sm font-medium">{place ?? t.locationUnknown}</dd></div>
    </dl>
    <fieldset className="flex flex-col gap-2.5">
      <legend className="mb-2.5 text-sm font-semibold">{t.pickNumber}</legend>
      <div className="grid grid-cols-3 gap-2.5">
        {notice?.choices.map(number => <button key={number} type="button" aria-label={fillTemplate(t.choose, { number: String(number) })}
          aria-pressed={choice === number} onClick={() => setChoice(number)} className={cn(
            'h-[72px] rounded-xl text-3xl font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            choice === number ? 'border-2 border-primary bg-blue-50 text-blue-700' : 'border border-slate-300 bg-white text-foreground hover:bg-slate-50',
          )}>{number}</button>)}
      </div>
    </fieldset>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex flex-wrap gap-2.5">
      <Button variant="outline" className="h-11 flex-1 border-red-200 font-semibold text-red-700 hover:bg-red-50 hover:text-red-800" disabled={busy}
        onClick={() => { void decide(true); }}>{t.deny}</Button>
      <Button className="h-11 flex-1 font-semibold" disabled={busy || choice === null}
        onClick={() => { void decide(false); }}>{t.approve}</Button>
    </div>
    <p className="text-xs text-slate-500">{t.footnote}</p>
    {twoFactor.dialog}
  </DialogContent></Dialog>;
};
