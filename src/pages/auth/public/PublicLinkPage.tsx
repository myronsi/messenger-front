import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2Off, Loader2, UserRound } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { Button } from '@/shared/ui/button';
import { PublicCard } from '@/shared/ui/profile/PublicCard';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { localeOf } from '@/shared/lang/languages';
import { AuthShell } from '../ui/AuthShell';
import { loadPublicInvite, loadPublicName, type PublicLinkResult } from './publicLinkApi';

type Target = { kind: 'name'; name: string } | { kind: 'invite'; token: string };

const pathOf = (target: Target) => (target.kind === 'name' ? `/@${target.name}` : `/join/${target.token}`);

const usePublicLink = (target: Target) => {
  const [result, setResult] = useState<PublicLinkResult | null>(null);
  const [attempt, setAttempt] = useState(0);
  const kind = target.kind;
  const value = target.kind === 'name' ? target.name : target.token;
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    const load = kind === 'name' ? loadPublicName(value, controller.signal) : loadPublicInvite(value, controller.signal);
    load.then(setResult).catch(() => { if (!controller.signal.aborted) setResult({ kind: 'failed' }); });
    return () => controller.abort();
  }, [kind, value, attempt]);
  const retry = useCallback(() => setAttempt((count) => count + 1), []);
  return { result, retry };
};

export const PublicLinkPage = ({ target }: { target: Target }) => {
  const { translations, language } = useLanguage();
  const t = translations.sharing;
  const navigate = useNavigate();
  const { result, retry } = usePublicLink(target);
  const state = { returnPath: pathOf(target) };
  const actions = (
    <>
      <Button type="button" onClick={() => navigate('/register', { state })}>{t.signUp}</Button>
      <Button type="button" variant="outline" onClick={() => navigate('/login', { state })}>{t.openInMessenger}</Button>
    </>
  );
  const members = (count: number) => {
    const category = new Intl.PluralRules(localeOf(language)).select(count) as keyof typeof t.members;
    return (t.members[category] ?? t.members.other).replace('{count}', String(count));
  };

  let body;
  if (!result) {
    body = <div role="status" className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label={translations.loading} /></div>;
  } else if (result.kind === 'user') {
    const { user } = result;
    body = (
      <PublicCard seed={user.username} name={user.display_name} avatarUrl={user.avatar_url} subtitle={<span>@{user.username}</span>} text={user.bio}>
        <p className="text-sm text-muted-foreground">{fillTemplate(t.signUpToMessage, { name: user.display_name })}</p>
        {actions}
      </PublicCard>
    );
  } else if (result.kind === 'group') {
    const { group } = result;
    body = (
      <PublicCard seed={group.public_name || group.name} name={group.name} avatarUrl={group.avatar_url} text={group.description}
        subtitle={<>{group.public_name && <><span>@{group.public_name}</span><span aria-hidden="true">·</span></>}<span>{members(group.member_count)}</span></>}>
        <p className="text-sm text-muted-foreground">{t.signUpToJoin}</p>
        {actions}
      </PublicCard>
    );
  } else if (result.kind === 'unavailable') {
    const Icon = target.kind === 'name' ? UserRound : Link2Off;
    body = (
      <section className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="rounded-full bg-muted p-4"><Icon className="h-8 w-8 text-muted-foreground" aria-hidden="true" /></span>
        <h1 className="text-lg font-semibold">{target.kind === 'name' ? t.notAvailable : t.inviteNotAvailable}</h1>
        <p className="max-w-xs text-sm text-muted-foreground">{target.kind === 'name' ? t.notAvailableHint : t.inviteNotAvailableHint}</p>
        <div className="mt-2 flex w-full max-w-xs flex-col gap-2">{actions}</div>
      </section>
    );
  } else {
    body = (
      <section role="alert" className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm text-muted-foreground">{result.kind === 'limited' ? t.tooManyRequests : t.loadFailed}</p>
        <Button type="button" variant="outline" onClick={retry}>{t.retry}</Button>
      </section>
    );
  }

  return <AuthShell><div className="mt-6">{body}</div></AuthShell>;
};
