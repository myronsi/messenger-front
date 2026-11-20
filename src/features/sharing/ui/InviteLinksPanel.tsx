import { useState } from 'react';
import { Copy, Link2, Loader2, Plus, QrCode, Trash2 } from 'lucide-react';
import type { EntityId } from '@/shared/api/entityId';
import { problemCode } from '@/shared/api/problem';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { localeOf } from '@/shared/lang/languages';
import { copyText } from '@/shared/lib/copyText';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { Button } from '@/shared/ui/button';
import ConfirmModal from '@/shared/ui/ConfirmModal';
import { toast } from '@/shared/ui/sonner';
import {
  useCreateInviteLinkMutation, useGetInviteLinksQuery, useRevokeInviteLinkMutation, type InviteLink,
} from '@/entities/group';
import { EXPIRY_CHOICES, expiryFor, linkState, MAX_USES, parseUseLimit, type ExpiryChoice } from '../model/inviteLinks';
import { inviteLink } from '../model/links';
import { ShareLinkDialog } from './ShareLinkDialog';

const FIELD = 'w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring';

const actionError = (error: unknown, t: { linkLimit: string; accountLimited: string; actionFailed: string }) => {
  const code = problemCode(error);
  if (code === 'limit_reached') return t.linkLimit;
  if (code === 'account_restricted') return t.accountLimited;
  return t.actionFailed;
};

const CreateLinkForm = ({ chatId, onDone }: { chatId: EntityId; onDone: () => void }) => {
  const t = useLanguage().translations.sharing;
  const [name, setName] = useState('');
  const [expiry, setExpiry] = useState<ExpiryChoice>('never');
  const [limit, setLimit] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [create, { isLoading }] = useCreateInviteLinkMutation();
  const maxUses = parseUseLimit(limit);
  const submit = async () => {
    if (maxUses === 'invalid') return;
    setError(null);
    try {
      const link = await create({ chatId, name: name.trim() || null, expiresAt: expiryFor(expiry), maxUses }).unwrap();
      if (await copyText(inviteLink(link.token))) toast(t.linkCopied);
      onDone();
    } catch (caught) {
      setError(actionError(caught, t));
    }
  };
  return (
    <form className="space-y-3 rounded-lg border border-border bg-card p-3" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <h3 className="text-sm font-semibold">{t.newLink}</h3>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.linkName}</span>
        <input value={name} maxLength={64} placeholder={t.linkNamePlaceholder} onChange={(event) => setName(event.target.value)} className={FIELD} />
      </label>
      <fieldset className="space-y-1.5">
        <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.expiry}</legend>
        <div className="flex flex-wrap gap-2">
          {EXPIRY_CHOICES.map((choice) => (
            <label key={choice} className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${expiry === choice ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>
              <input type="radio" name="expiry" value={choice} checked={expiry === choice} onChange={() => setExpiry(choice)} className="sr-only" />
              {t.expiryOptions[choice]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="space-y-1.5">
        <label htmlFor="invite-limit" className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.useLimit}</label>
        <input id="invite-limit" value={limit} inputMode="numeric" placeholder={t.unlimited} aria-invalid={maxUses === 'invalid'} aria-describedby="invite-limit-hint"
          max={MAX_USES} onChange={(event) => setLimit(event.target.value)} className={FIELD} />
        <p id="invite-limit-hint" className={`text-xs ${maxUses === 'invalid' ? 'text-destructive' : 'text-muted-foreground'}`}>{t.useLimitHint}</p>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={isLoading || maxUses === 'invalid'}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{t.createLink}
      </Button>
    </form>
  );
};

const LinkRow = ({ link, onShare, onRevoke }: { link: InviteLink; onShare: () => void; onRevoke: () => void }) => {
  const { translations, language } = useLanguage();
  const t = translations.sharing;
  const state = linkState(link);
  const locale = localeOf(language);
  const uses = link.max_uses === null
    ? (t.uses[new Intl.PluralRules(locale).select(link.use_count) as keyof typeof t.uses] ?? t.uses.other).replace('{count}', String(link.use_count))
    : fillTemplate(t.usesOf, { count: String(link.use_count), max: String(link.max_uses) });
  const expiry = link.expires_at
    ? fillTemplate(t.expiresAt, { date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(link.expires_at)) })
    : t.neverExpires;
  const stateLabel = { active: null, revoked: t.revoked, expired: t.expired, used_up: t.usedUp }[state];
  const url = inviteLink(link.token);
  const copy = () => void copyText(url).then((ok) => toast(ok ? t.linkCopied : t.copyFailed));
  return (
    <li data-testid="invite-link" data-state={state} className={`flex items-start gap-3 px-3 py-3 ${state === 'active' ? '' : 'opacity-60'}`}>
      <Link2 className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{link.name || url.replace(/^https?:\/\//, '')}</p>
        <p className="text-xs text-muted-foreground">{stateLabel ? `${stateLabel} · ${uses}` : `${uses} · ${expiry}`}</p>
      </div>
      {state === 'active' && (
        <div className="flex shrink-0 gap-1">
          <button type="button" onClick={copy} aria-label={t.copyLink} title={t.copyLink} className="rounded-md p-2 hover:bg-accent"><Copy className="h-4 w-4" /></button>
          <button type="button" onClick={onShare} aria-label={t.share} title={t.share} className="rounded-md p-2 hover:bg-accent"><QrCode className="h-4 w-4" /></button>
          <button type="button" onClick={onRevoke} aria-label={t.revoke} title={t.revoke} className="rounded-md p-2 text-destructive hover:bg-destructive-soft"><Trash2 className="h-4 w-4" /></button>
        </div>
      )}
    </li>
  );
};

export const InviteLinksPanel = ({ chatId, groupName }: { chatId: EntityId; groupName: string }) => {
  const { translations } = useLanguage();
  const t = translations.sharing;
  const { data: links, isLoading, isError, refetch } = useGetInviteLinksQuery(chatId, { refetchOnMountOrArgChange: true });
  const [revoke] = useRevokeInviteLinkMutation();
  const [creating, setCreating] = useState(false);
  const [sharing, setSharing] = useState<InviteLink | null>(null);
  const [revoking, setRevoking] = useState<InviteLink | null>(null);
  const confirmRevoke = async () => {
    if (!revoking) return;
    const link = revoking;
    setRevoking(null);
    try {
      await revoke({ chatId, linkId: link.id }).unwrap();
    } catch {
      toast(t.actionFailed);
    }
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t.inviteLinksHint}</p>
      {creating
        ? <CreateLinkForm chatId={chatId} onDone={() => setCreating(false)} />
        : <Button type="button" className="w-full" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />{t.createLink}</Button>}
      {isLoading && <div role="status" className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label={translations.loading} /></div>}
      {isError && (
        <div role="alert" className="flex flex-col items-center gap-2 py-4 text-sm text-muted-foreground">
          {t.loadFailed}<Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>{t.retry}</Button>
        </div>
      )}
      {links && (links.length
        ? <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {links.map((link) => <LinkRow key={link.id} link={link} onShare={() => setSharing(link)} onRevoke={() => setRevoking(link)} />)}
        </ul>
        : <p className="py-4 text-center text-sm text-muted-foreground">{t.noLinks}</p>)}
      {sharing && (
        <ShareLinkDialog title={groupName} hint={t.shareGroupHint} url={inviteLink(sharing.token)} onClose={() => setSharing(null)} />
      )}
      {revoking && (
        <ConfirmModal title={t.revokeTitle} message={t.revokeDescription} confirmText={t.revoke} cancelText={translations.cancel}
          overlayClassName="z-[11002]" onCancel={() => setRevoking(null)} onConfirm={() => void confirmRevoke()} />
      )}
    </div>
  );
};
