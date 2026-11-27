import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import type { ChatImport } from '../api/importTypes';
import { useImportDialog } from '../model/useImportDialog';
import { useImportTargets, type ImportChatTarget, type ImportMe } from '../model/useImportTargets';
import { ImportFileStep } from './ImportFileStep';
import { ImportPreviewStep } from './ImportPreviewStep';
import { ImportProgressStep } from './ImportProgressStep';
import { ImportSendersStep } from './ImportSendersStep';
import { ImportStopPanel } from './ImportStopPanel';

export interface ImportChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  me: ImportMe;
  chat?: ImportChatTarget;
  onDone?: (result: ChatImport) => void;
}

const ImportChatDialogBody = ({ onOpenChange, me, chat: fixedChat, onDone }: Omit<ImportChatDialogProps, 'open'>) => {
  const { translations } = useLanguage();
  const t = translations.chatImport;
  const dialog = useImportDialog({ open: true, chatId: fixedChat?.chatId, meId: me.id, onDone });
  const targets = useImportTargets(true, me, dialog.target, fixedChat);
  const { step, busy, error, chat, progress, result, running } = dialog;
  const [stopping, setStopping] = useState(false);
  const [removing, setRemoving] = useState(false);
  const close = () => {
    if (running) {
      setStopping(true);
      return;
    }
    onOpenChange(false);
  };
  const keepRunning = (event: Event) => {
    if (!running) return;
    event.preventDefault();
    setStopping(true);
  };
  const pause = () => {
    setStopping(false);
    dialog.pause();
  };
  const remove = async () => {
    setRemoving(true);
    const removed = await dialog.stopAndRemove();
    setRemoving(false);
    setStopping(false);
    if (removed) onOpenChange(false);
  };

  return (
    <Dialog open onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent data-testid="import-chat-dialog" className="max-h-[90dvh] overflow-y-auto sm:max-w-lg" hideClose={running}
        onInteractOutside={keepRunning} onEscapeKeyDown={keepRunning}>
        <DialogTitle>{fixedChat ? t.importHistory : t.title}</DialogTitle>
        <DialogDescription className="sr-only">{t.chooseHint}</DialogDescription>
        {step === 'file' && (
          <ImportFileStep busy={busy} pending={dialog.pending} onFiles={(files) => void dialog.chooseFiles(files)}
            onDiscardPending={() => void dialog.discardPending()} />
        )}
        {step === 'preview' && chat && (
          <ImportPreviewStep chat={chat} busy={busy} target={dialog.target} chats={fixedChat ? undefined : targets.options}
            onTarget={dialog.setTarget} onDateOrder={(order) => void dialog.switchDateOrder(order)}
            onTimeZone={(zone) => void dialog.switchTimeZone(zone)} />
        )}
        {step === 'senders' && chat && (
          <ImportSendersStep senders={chat.senders} members={targets.members} meId={me.id} assignments={dialog.assignments}
            onChange={(key, assign) => dialog.setAssignments((current) => ({ ...current, [key]: assign }))} />
        )}
        {(step === 'progress' || step === 'done') && <ImportProgressStep progress={progress} result={result} />}
        {stopping && running && (
          <ImportStopPanel busy={removing} onKeep={() => setStopping(false)} onPause={pause} onRemove={() => void remove()} />
        )}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          {step === 'file' && <Button type="button" variant="ghost" onClick={close}>{t.actions.cancel}</Button>}
          {step === 'preview' && (
            <>
              <Button type="button" variant="ghost" onClick={() => dialog.setStep('file')}>{t.actions.back}</Button>
              <Button type="button" disabled={busy || !dialog.target} onClick={() => dialog.toSenders(targets.members)}>{t.actions.next}</Button>
            </>
          )}
          {step === 'senders' && (
            <>
              <Button type="button" variant="ghost" disabled={busy} onClick={() => dialog.setStep('preview')}>{t.actions.back}</Button>
              <Button type="button" disabled={busy} onClick={() => void dialog.start()}>{t.actions.start}</Button>
            </>
          )}
          {step === 'progress' && error && <Button type="button" onClick={() => void dialog.retry()}>{t.actions.retry}</Button>}
          {step === 'progress' && !stopping && (
            <Button type="button" variant="ghost" onClick={close}>{running ? t.stop.action : t.actions.close}</Button>
          )}
          {step === 'done' && <Button type="button" onClick={close}>{t.actions.close}</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const ImportChatDialog = ({ open, ...props }: ImportChatDialogProps) => (open ? <ImportChatDialogBody {...props} /> : null);
