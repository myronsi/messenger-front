import { useEffect, useId, useRef, useState } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Button } from './button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog';
import { Input } from './input';
import { Label } from './label';

export const TwoFactorDialog = ({ open, busy, error, onConfirm, onCancel }: {
  open: boolean; busy: boolean; error: string; onConfirm: (code: string) => void; onCancel: () => void;
}) => {
  const t = useLanguage().translations.twoFactorDialog;
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState('');
  useEffect(() => { if (open) setCode(''); }, [open]);
  useEffect(() => { if (error) input.current?.select(); }, [error]);
  return <Dialog open={open} onOpenChange={next => { if (!next && !busy) onCancel(); }}>
    <DialogContent className="z-[1400] max-w-sm" overlayClassName="z-[1400]" hideClose={busy}
      onOpenAutoFocus={event => { event.preventDefault(); input.current?.focus(); }} onPointerDownOutside={event => event.preventDefault()}>
      <DialogHeader>
        <DialogTitle>{t.title}</DialogTitle>
        <DialogDescription>{t.description}</DialogDescription>
      </DialogHeader>
      <form className="flex flex-col gap-4" onSubmit={event => { event.preventDefault(); if (code.trim()) onConfirm(code.trim()); }}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-code`} className="text-[13px] font-medium text-foreground">{t.label}</Label>
          <Input ref={input} id={`${id}-code`} autoComplete="one-time-code" autoCapitalize="none" spellCheck={false} maxLength={128} value={code}
            aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="h-11 border-input"
            onChange={event => setCode(event.target.value)} />
          {error && <p id={`${id}-error`} role="alert" className="text-sm text-red-700">{error}</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" className="h-11" disabled={busy} onClick={onCancel}>{t.cancel}</Button>
          <Button className="h-11 font-semibold" disabled={busy || !code.trim()}>{busy ? t.checking : t.confirm}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
};
