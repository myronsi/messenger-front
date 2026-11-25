import { CheckCircle2 } from 'lucide-react';
import { Progress } from '@/shared/ui/progress';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import type { ChatImport } from '../api/importTypes';
import type { ImportProgress } from '../model/runImport';

interface ImportProgressStepProps {
  progress: ImportProgress | null;
  result: ChatImport | null;
}

export const ImportProgressStep = ({ progress, result }: ImportProgressStepProps) => {
  const { translations } = useLanguage();
  const t = translations.chatImport;
  if (result) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm">
        <CheckCircle2 className="h-5 w-5 text-success" />{fillTemplate(t.done, { count: result.message_count.toLocaleString() })}
      </p>
    );
  }
  const phase = progress?.phase ?? 'files';
  const values = { done: (progress?.done ?? 0).toLocaleString(), total: (progress?.total ?? 0).toLocaleString() };
  const label = phase === 'finishing' ? t.progress.finishing : fillTemplate(phase === 'files' ? t.progress.files : t.progress.messages, values);
  const percent = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : phase === 'finishing' ? 100 : 0;
  return (
    <div className="space-y-3">
      <p role="status" className="text-sm">{label}</p>
      <Progress value={percent} aria-label={label} className="h-2" />
      <p className="text-xs text-muted-foreground">{t.progress.keepOpen}</p>
    </div>
  );
};
