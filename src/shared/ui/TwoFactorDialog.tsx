import { useEffect, useId, useRef, useState } from 'react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Button } from './button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog';
import { Input } from './input';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from './input-otp';
import { Label } from './label';

const CODE_LENGTH = 6;
const SLOT = 'h-11 w-10 text-base';

export const TwoFactorDialog = ({ open, busy, error, onConfirm, onCancel }: {
  open: boolean; busy: boolean; error: string; onConfirm: (code: string) => void; onCancel: () => void;
}) => {
  const t = useLanguage().translations.twoFactorDialog;
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState('');
  const [backup, setBackup] = useState(false);
  useEffect(() => { if (open) { setCode(''); setBackup(false); } }, [open]);
  useEffect(() => { if (error) input.current?.select(); }, [error]);
  const value = code.trim();
  const ready = backup ? !!value : value.length === CODE_LENGTH;
  const switchMode = () => {
    setBackup((current) => !current);
    setCode('');
    requestAnimationFrame(() => input.current?.focus());
  };
  const describedBy = error ? `${id}-error` : undefined;
  return <Dialog open={open} onOpenChange={next => { if (!next && !busy) onCancel(); }}>
    <DialogContent className="z-[1400] max-w-sm" overlayClassName="z-[1400]" hideClose={busy}
      onOpenAutoFocus={event => { event.preventDefault(); input.current?.focus(); }} onPointerDownOutside={event => event.preventDefault()}>
      <DialogHeader>
        <DialogTitle>{t.title}</DialogTitle>
        <DialogDescription>{t.description}</DialogDescription>
      </DialogHeader>
      <form className="flex flex-col gap-4" onSubmit={event => { event.preventDefault(); if (ready) onConfirm(value); }}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-code`} className="text-[13px] font-medium text-foreground">{backup ? t.backupLabel : t.codeLabel}</Label>
          {backup ? (
            <Input ref={input} id={`${id}-code`} autoComplete="one-time-code" autoCapitalize="none" spellCheck={false} maxLength={128} value={code}
              aria-invalid={Boolean(error)} aria-describedby={describedBy} className="h-11 border-input"
              onChange={event => setCode(event.target.value)} />
          ) : (
            <InputOTP ref={input} id={`${id}-code`} maxLength={CODE_LENGTH} pattern={REGEXP_ONLY_DIGITS} inputMode="numeric" autoComplete="one-time-code"
              value={code} onChange={setCode} pasteTransformer={pasted => pasted.replace(/\D/g, '')}
              aria-invalid={Boolean(error)} aria-describedby={describedBy} containerClassName="justify-center">
              <InputOTPGroup>
                {[0, 1, 2].map(index => <InputOTPSlot key={index} index={index} className={SLOT} />)}
              </InputOTPGroup>
              <InputOTPSeparator className="text-muted-foreground" />
              <InputOTPGroup>
                {[3, 4, 5].map(index => <InputOTPSlot key={index} index={index} className={SLOT} />)}
              </InputOTPGroup>
            </InputOTP>
          )}
          {error && <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{error}</p>}
          <button type="button" onClick={switchMode} disabled={busy}
            className="self-start text-sm font-medium text-primary hover:underline disabled:opacity-50">
            {backup ? t.useAuthenticator : t.useBackup}
          </button>
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" className="h-11" disabled={busy} onClick={onCancel}>{t.cancel}</Button>
          <Button className="h-11 font-semibold" disabled={busy || !ready}>{busy ? t.checking : t.confirm}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
};
