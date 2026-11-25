import { useRef } from 'react';
import { FileArchive, FolderOpen, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import type { PendingImport } from '../model/useImportResume';

interface ImportFileStepProps {
  busy: boolean;
  pending: PendingImport | null;
  onFiles: (files: File[]) => void;
  onDiscardPending: () => void;
}

const pickFolder = (input: HTMLInputElement | null) => {
  if (input) input.setAttribute('webkitdirectory', '');
};

export const ImportFileStep = ({ busy, pending, onFiles, onDiscardPending }: ImportFileStepProps) => {
  const { translations } = useLanguage();
  const t = translations.chatImport;
  const fileInput = useRef<HTMLInputElement | null>(null);
  const folderInput = useRef<HTMLInputElement | null>(null);
  const take = (list: FileList | null, input: HTMLInputElement | null) => {
    const files = list ? [...list] : [];
    if (input) input.value = '';
    onFiles(files);
  };

  return (
    <div className="space-y-4">
      {pending && (
        <div data-testid="import-resume" className="space-y-2 rounded-xl border border-border bg-muted/40 p-3 text-sm">
          <p className="font-medium">{t.resume.title}</p>
          <p className="text-muted-foreground">{fillTemplate(t.resume.hint, {
            name: pending.record.title,
            index: pending.current.next_index.toLocaleString(),
            total: pending.record.total.toLocaleString(),
          })}</p>
          <Button type="button" variant="ghost" size="sm" className="px-0 text-destructive hover:bg-transparent" onClick={onDiscardPending}>
            {t.resume.discard}
          </Button>
        </div>
      )}
      <p className="text-sm text-muted-foreground">{t.chooseHint}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={busy} onClick={() => fileInput.current?.click()}>
          <FileArchive className="mr-2 h-4 w-4" />{t.chooseFile}
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => folderInput.current?.click()}>
          <FolderOpen className="mr-2 h-4 w-4" />{t.chooseFolder}
        </Button>
      </div>
      <input ref={fileInput} data-testid="import-file-input" type="file" className="hidden" accept=".zip,.txt,.json,application/zip,text/plain,application/json"
        onChange={(event) => take(event.target.files, event.target)} />
      <input ref={(input) => { folderInput.current = input; pickFolder(input); }} data-testid="import-folder-input" type="file" multiple className="hidden"
        onChange={(event) => take(event.target.files, event.target)} />
      {busy && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />{t.reading}
        </p>
      )}
      <p className="text-xs text-muted-foreground">{t.privacyHint}</p>
    </div>
  );
};
