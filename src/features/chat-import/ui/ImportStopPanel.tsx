import { Button } from '@/shared/ui/button';
import { useLanguage } from '@/shared/contexts/LanguageContext';

interface ImportStopPanelProps {
  busy: boolean;
  onKeep: () => void;
  onPause: () => void;
  onRemove: () => void;
}

export const ImportStopPanel = ({ busy, onKeep, onPause, onRemove }: ImportStopPanelProps) => {
  const { translations } = useLanguage();
  const t = translations.chatImport.stop;
  return (
    <section aria-labelledby="import-stop-title" aria-describedby="import-stop-hint" data-testid="import-stop-panel"
      className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
      <p id="import-stop-title" className="text-sm font-medium">{t.title}</p>
      <p id="import-stop-hint" className="text-xs text-muted-foreground">{t.hint}</p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onRemove} className="text-destructive">{t.remove}</Button>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onPause}>{t.pause}</Button>
        <Button type="button" size="sm" disabled={busy} onClick={onKeep} autoFocus>{t.keep}</Button>
      </div>
    </section>
  );
};
