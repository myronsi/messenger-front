import { CheckCircle2 } from 'lucide-react';
import { Progress } from '@/shared/ui/progress';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import type { ChatImport } from '../api/importTypes';
import { importPercent } from '../model/activeImport';
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
  const finishing = progress?.phase === 'finishing';
  const count = (value = 0) => value.toLocaleString();
  const label = finishing ? t.progress.finishing : fillTemplate(t.progress.messages, { done: count(progress?.done), total: count(progress?.total) });
  const percent = progress && progress.total > 0 ? importPercent(progress.done, progress.total) : finishing ? 100 : 0;
  return (
    <div className="space-y-3">
      <p role="status" className="flex items-baseline gap-2 text-sm">
        <span className="min-w-0 flex-1">{label}</span>
        <span data-testid="import-percent" className="shrink-0 text-base font-semibold tabular-nums">{percent}%</span>
      </p>
      <Progress value={percent} aria-label={label} className="h-2" />
      {!!progress?.waitingSeconds && (
        <p role="status" className="text-xs text-warning">{fillTemplate(t.progress.waiting, { seconds: String(progress.waitingSeconds) })}</p>
      )}
      {!!progress?.filesTotal && !finishing && (
        <p className="text-xs text-muted-foreground">{fillTemplate(t.progress.files, { done: count(progress.filesDone), total: count(progress.filesTotal) })}</p>
      )}
      <p className="text-xs text-muted-foreground">{t.progress.keepOpen}</p>
    </div>
  );
};
