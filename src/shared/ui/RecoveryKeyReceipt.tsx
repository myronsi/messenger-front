import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, Download, QrCode } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { recoveryKeyGroups } from '@/shared/lib/recoveryKeyGroups';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

const download = (content: string, type: string, name: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const RecoveryKeyReceipt = ({ recoveryKey, username, onContinue, progress }: {
  recoveryKey: string; username: string; onContinue: () => void; progress?: { current: number; total: number };
}) => {
  const t = useLanguage().translations.recoveryReceipt;
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [showSkipWarning, setShowSkipWarning] = useState(false);
  const qr = useRef<SVGSVGElement>(null);
  const groups = recoveryKeyGroups(recoveryKey);
  const lastGroup = groups[groups.length - 1] || '';
  const confirmed = Boolean(lastGroup) && confirmation.trim().toUpperCase() === lastGroup.toUpperCase();
  const finish = (skipped: boolean) => {
    const flag = `recovery_receipt_skipped:${username}`;
    if (skipped) localStorage.setItem(flag, 'true');
    else localStorage.removeItem(flag);
    setConfirmation('');
    onContinue();
  };
  const filename = `messenger-recovery-${username.replace(/[^a-z0-9_-]/gi, '_')}`;
  const toolClass = 'h-11 w-full px-2 text-[13px]';
  return <div className="flex flex-col gap-[18px]">
    {progress && <div className="flex gap-1.5" role="img" aria-label={fillTemplate(t.stepOf, { current: String(progress.current), total: String(progress.total) })}>
      {Array.from({ length: progress.total }, (_, index) => <span key={index}
        className={cn('h-1 flex-1 rounded-sm', index < progress.current ? 'bg-primary' : 'bg-slate-200')} />)}
    </div>}
    <div className="flex flex-col gap-1.5">
      <h2 className="text-[22px] font-bold leading-tight text-foreground">{t.title}</h2>
      <p className="text-sm text-slate-600">{t.description}</p>
    </div>
    <div className="rounded-xl border border-dashed border-slate-400 bg-slate-50 p-3.5">
      <span className="sr-only" data-testid="recovery-key">{recoveryKey}</span>
      <div aria-hidden="true" className="grid grid-cols-4 gap-2">
        {groups.map((group, index) => <span key={index}
          className="select-all rounded-md border border-border bg-white py-2 text-center font-mono text-base font-semibold text-foreground">{group}</span>)}
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2">
      <Button variant="outline" className={toolClass} aria-label={t.copyLabel} onClick={() => {
        void navigator.clipboard.writeText(recoveryKey).then(() => setMessage(t.copied)).catch(() => setMessage(t.copyFailed));
      }}><Copy aria-hidden="true" />{t.copy}</Button>
      <Button variant="outline" className={toolClass} aria-label={t.txtLabel} onClick={() => download(
        `Messenger account recovery\nUsername: ${username}\nRecovery key: ${recoveryKey}\n\nKeep this file private.\n` +
        'Use Account recovery to reset your password. If two-factor authentication is enabled, you also need an authenticator or backup code.\n' +
        'The key is single use. Save the replacement after recovery. Regenerating the key invalidates this copy.\n',
        'text/plain;charset=utf-8', `${filename}.txt`,
      )}><Download aria-hidden="true" />{t.txt}</Button>
      <Button variant="outline" className={toolClass} aria-label={showQR ? t.hideQr : t.showQr} aria-expanded={showQR}
        onClick={() => setShowQR(value => !value)}><QrCode aria-hidden="true" />{t.qr}</Button>
    </div>
    {showQR && <div className="flex flex-col items-center gap-2">
      <QRCodeSVG ref={qr} value={recoveryKey} size={200} level="H" marginSize={4} title={t.qrTitle} />
      <p className="text-center text-sm text-slate-600">{t.qrPrivate}</p>
      <Button variant="outline" className="h-11" onClick={() => {
        if (qr.current) download(new XMLSerializer().serializeToString(qr.current), 'image/svg+xml', `${filename}.svg`);
      }}>{t.downloadQr}</Button>
    </div>}
    {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
    <p className="text-xs text-slate-600">{t.twoFactorNote}</p>
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="recovery-last-group" className="text-[13px] font-medium text-slate-700">{t.confirmLabel}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden="true" className="font-mono text-[15px] text-slate-400">•••• – •••• –</span>
        <Input id="recovery-last-group" autoComplete="off" spellCheck={false} maxLength={Math.max(4, lastGroup.length)}
          value={confirmation} onChange={event => setConfirmation(event.target.value)} aria-describedby={confirmed ? 'recovery-last-group-match' : undefined}
          className={cn('h-11 w-24 font-mono text-base font-semibold uppercase', confirmed && 'border-green-600 focus-visible:ring-green-600')} />
        {confirmed && <span id="recovery-last-group-match" className="flex items-center gap-1 text-[13px] text-green-700">
          <Check className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />{t.matches}</span>}
      </div>
    </div>
    <Button className="h-11 w-full text-[15px] font-semibold" disabled={!confirmed} onClick={() => finish(false)}>{t.continue}</Button>
    {!showSkipWarning ? <Button variant="ghost" className="h-11 text-[13px] font-normal text-slate-600" onClick={() => setShowSkipWarning(true)}>{t.skip}</Button>
      : <div role="alert" className="flex flex-col gap-2">
        <p className="text-sm text-red-700">{t.skipWarning}</p>
        <Button variant="outline" className="h-11" onClick={() => finish(true)}>{t.continueWithoutSaving}</Button>
      </div>}
  </div>;
};
