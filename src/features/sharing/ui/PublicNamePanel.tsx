import { useEffect, useState } from 'react';
import { Check, Copy, Globe, Loader2, QrCode, X } from 'lucide-react';
import type { EntityId } from '@/shared/api/entityId';
import { problemCode } from '@/shared/api/problem';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { copyText } from '@/shared/lib/copyText';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { PUBLIC_NAME } from '@/shared/lib/returnPath';
import { Button } from '@/shared/ui/button';
import { toast } from '@/shared/ui/sonner';
import { useClearGroupPublicNameMutation, useGetPublicNameAvailabilityQuery, useSetGroupPublicNameMutation } from '@/entities/group';
import { publicNameLink } from '../model/links';
import { ShareLinkDialog } from './ShareLinkDialog';

const useSettled = (value: string, delay = 400) => {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return settled;
};

export const PublicNamePanel = ({ chatId, groupName, publicName }: { chatId: EntityId; groupName: string; publicName: string | null }) => {
  const { translations } = useLanguage();
  const t = translations.sharing;
  const [value, setValue] = useState(publicName ?? '');
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [save, { isLoading: saving }] = useSetGroupPublicNameMutation();
  const [clear, { isLoading: clearing }] = useClearGroupPublicNameMutation();
  useEffect(() => { setValue(publicName ?? ''); }, [publicName]);
  const name = value.trim();
  const valid = PUBLIC_NAME.test(name);
  const ownName = !!publicName && name.toLowerCase() === publicName.toLowerCase();
  const changed = name !== (publicName ?? '');
  const settled = useSettled(name);
  const { data: available, isFetching } = useGetPublicNameAvailabilityQuery(settled, { skip: !valid || ownName || settled !== name });
  const checking = valid && !ownName && (settled !== name || isFetching);
  const status = !name || ownName ? null : !valid ? 'invalid' : checking ? 'checking' : available === false ? 'taken' : available ? 'free' : null;
  const canSave = valid && changed && (ownName || status === 'free') && !saving;

  const submit = async () => {
    if (!canSave) return;
    setError(null);
    try {
      await save({ chatId, name }).unwrap();
      toast(fillTemplate(t.publicNameSaved, { link: publicNameLink(name) }));
    } catch (caught) {
      const code = problemCode(caught);
      setError(code === 'already_exists' ? t.nameTaken : code === 'account_restricted' ? t.accountLimited : code === 'validation_failed' ? t.publicNameRules : t.actionFailed);
    }
  };
  const makePrivate = async () => {
    setError(null);
    try {
      await clear(chatId).unwrap();
      setValue('');
      toast(t.groupPrivateNow);
    } catch {
      setError(t.actionFailed);
    }
  };
  const link = publicName ? publicNameLink(publicName) : null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t.publicGroupHint}</p>
      {link && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <Globe className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span data-testid="public-group-link" className="min-w-0 flex-1 truncate text-sm">{link}</span>
          <button type="button" aria-label={t.copyLink} title={t.copyLink} className="rounded-md p-2 hover:bg-accent"
            onClick={() => void copyText(link).then((ok) => toast(ok ? t.linkCopied : t.copyFailed))}><Copy className="h-4 w-4" /></button>
          <button type="button" aria-label={t.share} title={t.share} className="rounded-md p-2 hover:bg-accent" onClick={() => setSharing(true)}>
            <QrCode className="h-4 w-4" />
          </button>
        </div>
      )}
      <form className="space-y-2 rounded-lg border border-border bg-card p-3" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <label htmlFor="group-public-name" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.publicName}</label>
        <div className="flex items-center rounded-md border border-border bg-card focus-within:ring-2 focus-within:ring-ring">
          <span className="pl-3 text-sm text-muted-foreground">@</span>
          <input id="group-public-name" value={value} maxLength={32} autoComplete="off" spellCheck={false}
            aria-invalid={status === 'invalid' || status === 'taken'} aria-describedby="group-public-name-status"
            onChange={(event) => { setValue(event.target.value); setError(null); }}
            className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-foreground outline-none" />
        </div>
        <p id="group-public-name-status" aria-live="polite" className={`flex items-center gap-1 text-xs ${
          status === 'taken' || status === 'invalid' ? 'text-destructive' : status === 'free' ? 'text-success' : 'text-muted-foreground'}`}>
          {status === 'checking' && <><Loader2 className="h-3 w-3 animate-spin" />{t.nameChecking}</>}
          {status === 'free' && <><Check className="h-3 w-3" />{t.nameAvailable}</>}
          {status === 'taken' && <><X className="h-3 w-3" />{t.nameTaken}</>}
          {(status === 'invalid' || status === null) && t.publicNameRules}
        </p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={!canSave}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}{publicName ? t.saveName : t.makePublic}
        </Button>
      </form>
      {publicName && (
        <Button type="button" variant="outline" className="w-full" disabled={clearing} onClick={() => void makePrivate()}>{t.makePrivate}</Button>
      )}
      {sharing && link && <ShareLinkDialog title={groupName} hint={t.shareGroupHint} url={link} onClose={() => setSharing(false)} />}
    </div>
  );
};
