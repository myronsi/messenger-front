import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplateNodes } from '@/shared/lib/fillTemplateNodes';
import { cn } from '@/shared/lib/utils';
import { HelpSiteLink } from '@/shared/ui/HelpSiteLink';

export const GuidelinesHint = ({ className }: { className?: string }) => {
  const t = useLanguage().translations.legal;
  const link = (
    <HelpSiteLink page="guidelines" className="rounded-sm text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {t.documents.guidelines}
    </HelpSiteLink>
  );
  return <p className={cn('text-xs text-muted-foreground', className)}>{fillTemplateNodes(t.rulesHint, { guidelines: link })}</p>;
};
