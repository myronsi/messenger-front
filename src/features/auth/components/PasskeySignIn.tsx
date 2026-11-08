import { useEffect, useRef, useState } from 'react';
import { browserSupportsWebAuthn, browserSupportsWebAuthnAutofill, WebAuthnAbortService } from '@simplewebauthn/browser';
import { PasskeyVerifyError, signInWithPasskey } from '@/shared/api/passkeys';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Fingerprint } from 'lucide-react';
import { Button } from '@/shared/ui/button';

const AUTOFILL_REARM_MS = 4 * 60 * 1000;

const PasskeyIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  <circle cx="9" cy="8" r="4" /><path d="M3 21v-1a6 6 0 0 1 9-5.2" /><circle cx="18" cy="15" r="2.5" /><path d="M18 17.5V22M18 20h2" />
</svg>;

export const PasskeySignIn = ({ username, onSignedIn, compact = false }: { username: string; onSignedIn: (username: string) => void; compact?: boolean }) => {
  const { translations } = useLanguage();
  const t = translations.signInScreen;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [autofillRun, setAutofillRun] = useState(0);
  const supported = browserSupportsWebAuthn();
  const onSignedInRef = useRef(onSignedIn);
  onSignedInRef.current = onSignedIn;
  const busyRef = useRef(busy);
  busyRef.current = busy;
  useEffect(() => {
    if (!supported) return;
    const controller = new AbortController();
    const rearm = window.setTimeout(() => {
      if (!busyRef.current) setAutofillRun(run => run + 1);
    }, AUTOFILL_REARM_MS);
    void browserSupportsWebAuthnAutofill().then(async available => {
      if (!available || controller.signal.aborted) return;
      const user = await signInWithPasskey('', true, controller.signal);
      if (!controller.signal.aborted) onSignedInRef.current(user);
    }).catch((failure: unknown) => {
      if (controller.signal.aborted || !(failure instanceof PasskeyVerifyError)) return;
      setError(true);
      setAutofillRun(run => run + 1);
    });
    return () => { window.clearTimeout(rearm); controller.abort(); WebAuthnAbortService.cancelCeremony(); };
  }, [supported, autofillRun]);
  if (!supported) return null;
  return <>
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" disabled={busy} aria-label={compact && !busy ? t.passkeyButton : undefined}
        className="h-11 w-full gap-2.5 border-input text-[15px] [&_svg]:size-[18px]" onClick={() => {
        setBusy(true); setError(false);
        void signInWithPasskey(username).then(onSignedIn).catch(() => {
          setError(true);
          setAutofillRun(run => run + 1);
        }).finally(() => setBusy(false));
      }}>{compact ? <Fingerprint aria-hidden="true" /> : <PasskeyIcon />}{busy ? t.passkeyWaiting : compact ? translations.authLayout.passkeyShort : t.passkeyButton}</Button>
      {error && <p role="alert" className="text-sm text-destructive">{t.passkeyFailed}</p>}
    </div>
  </>;
};
