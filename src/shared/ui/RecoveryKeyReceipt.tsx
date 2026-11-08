import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, ChevronDown, Copy, Download, KeyRound, Lock, ShieldAlert } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { recoveryKeyGroups } from '@/shared/lib/recoveryKeyGroups';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { localeOf } from '@/shared/lang/languages';

const download = (content: string, type: string, name: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const RecoveryKeyReceipt = ({ recoveryKey, username, onContinue, context = 'account' }: {
  recoveryKey: string; username: string; onContinue: () => void; context?: 'signup' | 'account';
}) => {
  const { language, translations } = useLanguage();
  const t = translations.recoveryReceipt;
  const [saved, setSaved] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [showSkipWarning, setShowSkipWarning] = useState(false);
  const qr = useRef<SVGSVGElement>(null);
  const groups = recoveryKeyGroups(recoveryKey);
  const showTwoFactor = context === 'account';
  const filename = `messenger-recovery-${username.replace(/[^a-z0-9_-]/gi, '_')}`;

  const finish = (skipped: boolean) => {
    const flag = `recovery_receipt_skipped:${username}`;
    if (skipped) localStorage.setItem(flag, 'true');
    else localStorage.removeItem(flag);
    onContinue();
  };

  const fileText = () => [
    t.fileTitle,
    `${t.fileAccount}: ${username}`,
    `${t.fileCreated}: ${new Date().toLocaleDateString(localeOf(language), { day: 'numeric', month: 'short', year: 'numeric' })}`,
    '',
    groups.slice(0, 4).join('-'),
    groups.slice(4).join('-'),
    '',
    t.fileHowTo,
    `1. ${fillTemplate(t.fileStep1, { forgot: translations.signInScreen.forgotPassword })}`,
    `2. ${fillTemplate(t.fileStep2, { option: translations.recoveryFlow.keyOption })}`,
    `3. ${t.fileStep3}`,
    ...(showTwoFactor ? ['', t.twoFactorNote] : []),
    '',
    t.fileSingleUse,
    t.filePrivate,
    '',
  ].filter((line, index, lines) => line !== '' || lines[index - 1] !== '').join('\n');

  const handleDownload = () => {
    download(fileText(), 'text/plain;charset=utf-8', `${filename}.txt`);
    setDownloaded(true);
    setSaved(true);
  };

  const handleCopy = () => {
    void navigator.clipboard.writeText(recoveryKey).then(() => {
      setCopied(true);
      setSaved(true);
      setMessage('');
    }).catch(() => setMessage(t.copyFailed));
  };

  return <div className="flex flex-col gap-5">
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
        <KeyRound className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-[22px] font-bold leading-tight text-foreground">{t.title}</h2>
        <p className="text-sm text-subtle-foreground">{t.description}</p>
      </div>
    </div>

    <section aria-label={t.keyLabel} className="rounded-xl border border-border p-3">
      <p className="mb-2 text-xs text-muted-foreground">{t.keyLabel}</p>
      <span className="sr-only" data-testid="recovery-key">{recoveryKey}</span>
      <div aria-hidden="true" className="grid grid-cols-4 gap-1.5">
        {groups.map((group, index) => <span key={index}
          className="select-all rounded-md bg-muted py-2 text-center font-mono text-[15px] font-semibold tracking-wider text-foreground slashed-zero">{group}</span>)}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t.caseNote}</p>
    </section>

    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Button className="h-11 gap-2 text-[15px] font-semibold" onClick={handleDownload}>
          {downloaded ? <Check aria-hidden="true" /> : <Download aria-hidden="true" />}{downloaded ? t.downloaded : t.download}
        </Button>
        <Button variant="outline" className="h-11 gap-2 border-input px-4" onClick={handleCopy} aria-label={copied ? t.copied : t.copyLabel}>
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{copied ? t.copied : t.copy}
        </Button>
      </div>
      <button type="button" aria-expanded={showMore} onClick={() => setShowMore((value) => !value)}
        className="inline-flex items-center gap-1 self-start rounded-sm text-[13px] text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showMore && 'rotate-180')} aria-hidden="true" />{t.moreWays}
      </button>
      {showMore && <div className="flex items-center gap-4 rounded-lg bg-muted/60 p-3">
        <div className="qr-surface shrink-0 rounded-md p-1">
          <QRCodeSVG ref={qr} value={recoveryKey} size={112} level="H" marginSize={2} title={t.qrTitle} />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs text-subtle-foreground">{t.qrHint} {t.qrPrivate}</p>
          <Button variant="outline" size="sm" className="self-start border-input" onClick={() => {
            if (qr.current) download(new XMLSerializer().serializeToString(qr.current), 'image/svg+xml', `${filename}.svg`);
          }}>{t.downloadQr}</Button>
        </div>
      </div>}
      {message && <p role="status" className="text-sm text-subtle-foreground">{message}</p>}
    </div>

    <ul className="flex flex-col gap-2 text-xs text-subtle-foreground">
      <li className="flex items-start gap-2"><Lock className="mt-px h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{t.tipStore}</li>
      <li className="flex items-start gap-2"><ShieldAlert className="mt-px h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{t.tipShare}</li>
      {showTwoFactor && <li className="pl-6">{t.twoFactorNote}</li>}
    </ul>

    <label className={cn('flex items-start gap-3 rounded-lg border border-border p-3 transition-opacity', saved ? 'cursor-pointer' : 'cursor-not-allowed opacity-60')}>
      <input type="checkbox" checked={confirmed} disabled={!saved} onChange={(event) => setConfirmed(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm text-foreground">{t.savedCheck}</span>
        {!confirmed && <span className="text-xs text-muted-foreground">{saved ? t.savedHintReady : t.savedHintLocked}</span>}
      </span>
    </label>

    <div className="flex flex-col gap-1">
      <Button className="h-11 w-full text-[15px] font-semibold" disabled={!confirmed} onClick={() => finish(false)}>{t.continue}</Button>
      {!showSkipWarning ? <Button variant="ghost" className="h-10 text-[13px] font-normal text-subtle-foreground" onClick={() => setShowSkipWarning(true)}>{t.skip}</Button>
        : <div role="alert" className="mt-2 flex flex-col gap-2">
          <p className="text-sm text-destructive">{t.skipWarning}</p>
          <Button variant="outline" className="h-11" onClick={() => finish(true)}>{t.continueWithoutSaving}</Button>
        </div>}
    </div>
  </div>;
};
