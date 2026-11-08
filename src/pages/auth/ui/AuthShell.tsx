import React from 'react';
import { MessageSquare, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { DocsLink } from '@/shared/ui/DocsLink';
import { cn } from '@/shared/lib/utils';
import { AuthToolbar } from './AuthToolbar';

export const BrandMark: React.FC<{ className?: string }> = ({ className }) => {
  const t = useLanguage().translations.authLayout;
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary text-primary-foreground">
        <MessageSquare className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <span className="text-base font-semibold text-foreground">{t.brand}</span>
    </div>
  );
};

export const SignInAside: React.FC = () => {
  const t = useLanguage().translations.authLayout;
  const bubble = 'max-w-[80%] rounded-bubble px-3 py-1.5 text-sm';
  return (
    <div className="flex flex-1 flex-col">
      <div className="mt-10 flex flex-col gap-3">
        <h2 className="text-2xl font-semibold leading-snug tracking-tight text-foreground">{t.tagline}</h2>
        <p className="text-sm leading-relaxed text-subtle-foreground">{t.taglineDescription}</p>
      </div>
      <div aria-hidden="true" className="chat-bg-plain mt-auto flex flex-col gap-2 rounded-xl border border-border p-4 shadow-sm">
        <div className={cn(bubble, 'bubble-in self-start bg-accent text-accent-foreground')}>{t.previewIncoming}</div>
        <div className={cn(bubble, 'bubble-out self-end bg-primary text-primary-foreground')}>{t.previewOutgoing}</div>
        <div className={cn(bubble, 'bubble-in self-start bg-accent text-accent-foreground')}>{t.previewReply}</div>
      </div>
    </div>
  );
};

export const RecoveryNote: React.FC = () => {
  const t = useLanguage().translations.authLayout;
  return (
    <p className="mt-auto flex items-start gap-2 text-xs leading-relaxed text-subtle-foreground">
      <ShieldCheck className="mt-px h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{t.recoveryNote}
    </p>
  );
};

export const AuthShell: React.FC<{ aside?: React.ReactNode; children: React.ReactNode }> = ({ aside, children }) => {
  const { translations } = useLanguage();
  return (
    <div className="flex min-h-[100dvh] bg-background sm:items-center sm:justify-center sm:bg-muted/50 sm:p-6">
      <div data-testid="auth-shell" className="flex w-full flex-col bg-background sm:max-w-[480px] sm:overflow-hidden sm:rounded-2xl sm:border sm:border-border sm:bg-card sm:shadow-sm lg:grid lg:min-h-[640px] lg:max-w-[1000px] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <aside className="hidden flex-col gap-8 border-r border-border bg-muted/50 p-10 lg:flex">
          <BrandMark />
          {aside ?? <SignInAside />}
        </aside>
        <main className="flex min-w-0 flex-1 flex-col px-4 pb-6 pt-4 sm:px-10 sm:pb-8 sm:pt-6">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
            <BrandMark className="lg:invisible" />
            <AuthToolbar />
          </div>
          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col pb-8 pt-6 sm:pt-10 animate-fade-in lg:pt-[72px]">{children}</div>
          <p className="text-center text-sm">
            <DocsLink className="rounded-sm text-muted-foreground hover:text-primary hover:underline">{translations.docsLink}</DocsLink>
          </p>
        </main>
      </div>
    </div>
  );
};
