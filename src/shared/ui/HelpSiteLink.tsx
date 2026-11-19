import type { AnchorHTMLAttributes } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { helpSiteUrl, type LegalPage } from '@/shared/lib/helpSite';

type HelpSiteLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel'> & { page?: LegalPage };

export function HelpSiteLink({ page, children, ...props }: HelpSiteLinkProps) {
  const { language } = useLanguage();
  return <a {...props} href={helpSiteUrl(page, language)} target="_blank" rel="noopener noreferrer">{children}</a>;
}
