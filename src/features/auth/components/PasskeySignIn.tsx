import { useEffect, useRef, useState } from 'react';
import { browserSupportsWebAuthn, browserSupportsWebAuthnAutofill, WebAuthnAbortService } from '@simplewebauthn/browser';
import { signInWithPasskey } from '@/shared/api/passkeys';
import { Button } from '@/shared/ui/button';

export const PasskeySignIn = ({ username, onSignedIn }: { username: string; onSignedIn: (username: string) => void }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const supported = browserSupportsWebAuthn();
  const onSignedInRef = useRef(onSignedIn);
  onSignedInRef.current = onSignedIn;
  useEffect(() => {
    if (!supported) return;
    const controller = new AbortController();
    void browserSupportsWebAuthnAutofill().then(async available => {
      if (!available || controller.signal.aborted) return;
      const user = await signInWithPasskey('', true, controller.signal);
      if (!controller.signal.aborted) onSignedInRef.current(user);
    }).catch(() => {});
    return () => { controller.abort(); WebAuthnAbortService.cancelCeremony(); };
  }, [supported]);
  if (!supported) return null;
  return <div className="w-full space-y-2">
    <Button type="button" variant="outline" disabled={busy} className="w-full" onClick={() => {
      setBusy(true); setError('');
      void signInWithPasskey(username).then(onSignedIn).catch(() => setError('Passkey sign-in failed or was cancelled. You can use your password.'))
        .finally(() => setBusy(false));
    }}>{busy ? 'Waiting for passkey…' : 'Sign in with a passkey'}</Button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
};
