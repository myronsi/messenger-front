import { useState } from 'react';
import { Check, Copy, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { copyText } from '@/shared/lib/copyText';
import { localeOf } from '@/shared/lang/languages';
import {
  providerName, ProviderIcon, useClaimConnectionMutation, useVerifyConnectionMutation,
  type ConnectionChallenge, type ConnectionProvider,
} from '@/features/connections';

interface Props {
  provider: ConnectionProvider | null;
  onClose: () => void;
  onConnected: (provider: ConnectionProvider) => void;
}

const HINTS = { bluesky: 'identifierBluesky', mastodon: 'identifierMastodon', website: 'identifierWebsite' } as const;
const WHERE = { bluesky: 'whereBluesky', mastodon: 'whereMastodon', website: 'whereWebsite' } as const;

const statusOf = (error: unknown) => (typeof error === 'object' && error !== null && 'status' in error ? (error as { status: unknown }).status : null);

export default function ConnectionVerifyDialog({ provider, onClose, onConnected }: Props) {
  const { translations, language } = useLanguage();
  const t = translations.connections;
  const [identifier, setIdentifier] = useState('');
  const [challenge, setChallenge] = useState<ConnectionChallenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [claim, { isLoading: claiming }] = useClaimConnectionMutation();
  const [verify, { isLoading: verifying }] = useVerifyConnectionMutation();
  const kind = provider === 'bluesky' || provider === 'mastodon' || provider === 'website' ? provider : null;

  const close = () => {
    setIdentifier('');
    setChallenge(null);
    setError(null);
    setCopied(false);
    onClose();
  };
  const submitClaim = async () => {
    if (!provider || !identifier.trim()) return;
    setError(null);
    try {
      setChallenge(await claim({ provider, identifier: identifier.trim() }).unwrap());
    } catch (cause) {
      setError(statusOf(cause) === 409 ? t.limit : t.actionFailed);
    }
  };
  const submitVerify = async () => {
    if (!provider) return;
    setError(null);
    try {
      await verify(provider).unwrap();
      onConnected(provider);
      close();
    } catch (cause) {
      setError(statusOf(cause) === 422 ? t.notFound : statusOf(cause) === 409 ? t.limit : t.actionFailed);
    }
  };
  const copy = () => {
    if (!challenge) return;
    void copyText(challenge.code).then((ok) => setCopied(ok));
  };
  const expires = challenge ? new Date(challenge.expires_at).toLocaleTimeString(localeOf(language), { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <Dialog open={!!provider} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className="max-w-md" data-testid="connection-verify-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {provider && <ProviderIcon provider={provider} />}
            {fillTemplate(t.verifyTitle, { provider: providerName(provider ?? '') })}
          </DialogTitle>
          {challenge && kind && (
            <DialogDescription>{fillTemplate(t[WHERE[kind]], { domain: challenge.identifier })}</DialogDescription>
          )}
        </DialogHeader>
        {!challenge ? (
          <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void submitClaim(); }}>
            <Input autoFocus value={identifier} maxLength={300} onChange={(event) => setIdentifier(event.target.value)}
              placeholder={kind ? t[HINTS[kind]] : ''} aria-label={kind ? t[HINTS[kind]] : ''} />
            <Button type="submit" className="w-full" disabled={claiming || !identifier.trim()}>
              {claiming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t.next}
            </Button>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium">{t.codeTitle}</p>
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2">
              <code data-testid="connection-code" className="min-w-0 flex-1 break-all text-sm">{challenge.code}</code>
              <Button type="button" size="sm" variant="ghost" onClick={copy} aria-label={t.copyCode}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{fillTemplate(t.expires, { time: expires })}</p>
            <Button type="button" className="w-full" disabled={verifying} onClick={() => void submitVerify()}>
              {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t.verify}
            </Button>
          </div>
        )}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
