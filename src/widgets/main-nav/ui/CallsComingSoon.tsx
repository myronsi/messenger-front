import type React from 'react';
import { Phone } from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { TabHeader } from '@/shared/ui/TabHeader';

const CallsComingSoon: React.FC = () => {
  const { translations } = useLanguage();
  const t = translations.mainNav;
  return (
    <section aria-label={t.callsTitle} className="flex h-full flex-col bg-background">
      <TabHeader title={t.callsTitle} />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Phone className="h-9 w-9" />
        </span>
        <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">{t.comingSoon}</span>
        <p className="max-w-xs text-sm text-muted-foreground">{t.callsHint}</p>
      </div>
    </section>
  );
};

export default CallsComingSoon;
