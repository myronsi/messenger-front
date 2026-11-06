import { useCallback, useRef, useState } from 'react';
import { isTwoFactorRequired, problemCode, problemDetail, problemStatus } from '@/shared/api/problem';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { TwoFactorDialog } from './TwoFactorDialog';

export class TwoFactorCancelled extends Error {
  constructor() { super('Two-factor confirmation was cancelled.'); }
}

export const isTwoFactorCancelled = (error: unknown) => error instanceof TwoFactorCancelled;

const isCodeError = (error: unknown) => {
  const code = problemCode(error);
  return code === 'two_factor_required' || code === 'invalid_two_factor_code' || (code === 'invalid_credentials' && problemStatus(error) === 400);
};

type Pending = {
  run: (code: string) => Promise<unknown>; retryable: (error: unknown) => boolean; resolve: (value: unknown) => void; reject: (error: unknown) => void;
};

export const useTwoFactorConfirm = (enabled?: boolean) => {
  const t = useLanguage().translations.twoFactorDialog;
  const pending = useRef<Pending | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ask = useCallback(<T,>(run: (code: string) => Promise<T>, retryable: (error: unknown) => boolean = isCodeError) => new Promise<T>((resolve, reject) => {
    pending.current?.reject(new TwoFactorCancelled());
    pending.current = { run, retryable, resolve: value => resolve(value as T), reject };
    setError(''); setOpen(true);
  }), []);

  const confirm = useCallback(async <T,>(run: (code?: string) => Promise<T>): Promise<T> => {
    if (enabled) return ask(run);
    try { return await run(); }
    catch (caught) {
      if (isTwoFactorRequired(caught)) return ask(run);
      throw caught;
    }
  }, [ask, enabled]);

  const submit = async (code: string) => {
    const current = pending.current;
    if (!current) return;
    setBusy(true); setError('');
    try {
      const value = await current.run(code);
      pending.current = null; setOpen(false); current.resolve(value);
    } catch (caught) {
      if (current.retryable(caught)) setError(problemCode(caught) === 'invalid_credentials' ? problemDetail(caught) || t.invalidCode : t.invalidCode);
      else { pending.current = null; setOpen(false); current.reject(caught); }
    } finally { setBusy(false); }
  };

  const cancel = () => {
    const current = pending.current;
    pending.current = null; setOpen(false); setError('');
    current?.reject(new TwoFactorCancelled());
  };

  const dialog = <TwoFactorDialog open={open} busy={busy} error={error} onConfirm={code => { void submit(code); }} onCancel={cancel} />;
  return { confirm, ask, dialog };
};
