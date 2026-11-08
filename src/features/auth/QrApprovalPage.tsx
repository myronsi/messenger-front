import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, Clock, ShieldAlert, XCircle } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { deviceLabel } from '@/shared/lib/deviceLabel';
import { locationLabel } from '@/shared/lib/locationLabel';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { isTwoFactorCancelled, useTwoFactorConfirm } from '@/shared/ui/useTwoFactorConfirm';
import { approveQrLogin, denyQrLogin, getQrLogin, isQrLoginForbidden, isQrLoginGone, isQrLoginUsed } from './api/qrLoginApi';
import type { QrLoginDetails } from './model/qrLoginTypes';
import { QR_LOGIN_TTL_MS } from './model/requestLifetimes';
import { localeOf } from '@/shared/lang/languages';

type View = 'loading' | 'ready' | 'approved' | 'denied' | 'expired' | 'used' | 'failed';

const viewFor = (status: QrLoginDetails['status']): View => (
  status === 'pending' || status === 'scanned' ? 'ready' : status === 'expired' ? 'expired' : 'used'
);

const Outcome = ({ icon, title, hint, action }: { icon: ReactNode; title: string; hint?: string; action: ReactNode }) => (
  <div className="flex flex-col items-center gap-4 text-center">
    {icon}
    <h1 role="status" className="text-[22px] font-bold leading-tight text-foreground">{title}</h1>
    {hint && <p className="text-sm text-subtle-foreground">{hint}</p>}
    {action}
  </div>
);

export const QrApprovalPage = ({ requestId, twoFactorEnabled, onClose }: { requestId: string; twoFactorEnabled?: boolean; onClose: () => void }) => {
  const { translations, language } = useLanguage();
  const t = translations.qrLogin;
  const twoFactor = useTwoFactorConfirm(twoFactorEnabled);
  const [details, setDetails] = useState<QrLoginDetails | null>(null);
  const [view, setView] = useState<View>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setView('loading'); setError('');
    getQrLogin(requestId, controller.signal).then(result => {
      setDetails(result);
      setView(viewFor(result.status));
    }).catch(caught => {
      if (controller.signal.aborted) return;
      setView(isQrLoginGone(caught) ? 'expired' : 'failed');
    });
    return () => controller.abort();
  }, [requestId, attempt]);

  useEffect(() => {
    if (view !== 'ready' || !details) return;
    const remaining = Date.parse(details.expires_at) - Date.now();
    if (!(remaining > 0)) return;
    const timer = window.setTimeout(() => setView('expired'), Math.min(remaining, QR_LOGIN_TTL_MS));
    return () => clearTimeout(timer);
  }, [view, details]);

  const decide = useCallback(async (approve: boolean) => {
    setBusy(true); setError('');
    try {
      if (approve) await twoFactor.confirm(code => approveQrLogin(requestId, code));
      else await denyQrLogin(requestId);
      setView(approve ? 'approved' : 'denied');
    } catch (caught) {
      if (isTwoFactorCancelled(caught)) return;
      if (isQrLoginGone(caught)) setView('expired');
      else if (isQrLoginUsed(caught)) setView('used');
      else setError(isQrLoginForbidden(caught) ? t.staleSession : t.actionFailed);
    } finally { setBusy(false); }
  }, [requestId, t, twoFactor]);

  const back = <Button className="h-11 w-full font-semibold" onClick={onClose}>{t.backToChats}</Button>;
  const iconClass = 'h-12 w-12';
  const content = view === 'loading' ? <p role="status" className="py-10 text-center text-sm text-subtle-foreground">{t.checking}</p>
    : view === 'approved' ? <Outcome icon={<CheckCircle2 className={`${iconClass} text-success`} aria-hidden="true" />} title={t.approved} action={back} />
      : view === 'denied' ? <Outcome icon={<XCircle className={`${iconClass} text-muted-foreground`} aria-hidden="true" />} title={t.deniedDone} action={back} />
        : view === 'used' ? <Outcome icon={<Clock className={`${iconClass} text-muted-foreground`} aria-hidden="true" />} title={t.alreadyUsed}
          hint={t.alreadyUsedHint} action={back} />
        : view === 'expired' ? <Outcome icon={<Clock className={`${iconClass} text-muted-foreground`} aria-hidden="true" />} title={t.expiredTitle}
          hint={t.expiredHint} action={back} />
          : view === 'failed' ? <Outcome icon={<XCircle className={`${iconClass} text-destructive`} aria-hidden="true" />} title={t.loadFailed} action={<div
            className="flex w-full flex-col gap-2"><Button className="h-11 w-full" onClick={() => setAttempt(value => value + 1)}>{t.retry}</Button>
            <Button variant="link" className="h-11" onClick={onClose}>{t.backToChats}</Button></div>} />
            : <QrApprovalDetails details={details!} language={language} busy={busy} error={error} onDecide={approve => { void decide(approve); }} />;

  return <Card className="mx-auto flex w-full max-w-md flex-col gap-5 rounded-2xl border-border p-6 shadow-sm sm:p-8">
    {content}
    {twoFactor.dialog}
  </Card>;
};

const QrApprovalDetails = ({ details, language, busy, error, onDecide }: {
  details: QrLoginDetails; language: string; busy: boolean; error: string; onDecide: (approve: boolean) => void;
}) => {
  const t = useLanguage().translations.qrLogin;
  const place = locationLabel(details.location, language);
  const time = new Date(details.created_at).toLocaleTimeString(localeOf(language), { hour: '2-digit', minute: '2-digit' });
  const facts = [
    [t.device, details.device ? deviceLabel(details.device) : t.unknownDevice],
    [t.location, place ?? t.locationUnknown],
    [t.time, Number.isNaN(Date.parse(details.created_at)) ? '—' : time],
  ];
  return <>
    <div className="flex flex-col gap-1.5">
      <h1 className="text-[22px] font-bold leading-tight text-foreground">{t.approveTitle}</h1>
      <p className="text-sm text-subtle-foreground">{t.approveIntro}</p>
    </div>
    <dl className="grid grid-cols-1 gap-2.5 rounded-[10px] border border-border bg-muted/50 px-3.5 py-3 sm:grid-cols-3">
      {facts.map(([label, value]) => <div key={label} className="min-w-0">
        <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 break-words text-sm font-medium">{value}</dd>
      </div>)}
    </dl>
    <p role="note" className="flex gap-2.5 rounded-[10px] border border-warning/30 bg-warning-soft px-3.5 py-3 text-[13px] text-warning">
      <ShieldAlert className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" />{t.warning}
    </p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-2.5">
      <Button variant="outline" className="h-11 flex-1 border-destructive/30 font-semibold text-destructive hover:bg-destructive-soft hover:text-destructive" disabled={busy}
        onClick={() => onDecide(false)}>{t.deny}</Button>
      <Button className="h-11 flex-1 font-semibold" disabled={busy} onClick={() => onDecide(true)}>{t.approve}</Button>
    </div>
  </>;
};
