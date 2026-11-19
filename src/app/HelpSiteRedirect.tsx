import { useEffect } from 'react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { helpSiteUrl, leaveFor } from '@/shared/lib/helpSite';

export function HelpSiteRedirect() {
  const { translations } = useLanguage();
  const url = helpSiteUrl();
  useEffect(() => { leaveFor(url); }, [url]);
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background p-6 text-center text-sm">
      <a href={url} className="text-primary underline-offset-2 hover:underline">{translations.legal.help}</a>
    </main>
  );
}
