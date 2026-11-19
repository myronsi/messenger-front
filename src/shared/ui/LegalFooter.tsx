import { useLanguage } from '@/shared/contexts/LanguageContext';
import { LEGAL_PAGES } from '@/shared/lib/helpSite';
import { cn } from '@/shared/lib/utils';
import { HelpSiteLink } from './HelpSiteLink';

const linkClass = 'rounded-sm text-muted-foreground hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function LegalFooter({ className }: { className?: string }) {
  const t = useLanguage().translations.legal;
  return (
    <nav aria-label={t.footerLabel} className={cn('flex flex-wrap justify-center gap-x-4 gap-y-1 text-center text-[13px]', className)}>
      <HelpSiteLink className={linkClass}>{t.help}</HelpSiteLink>
      {LEGAL_PAGES.map((page) => <HelpSiteLink key={page} page={page} className={linkClass}>{t.documents[page]}</HelpSiteLink>)}
    </nav>
  );
}
