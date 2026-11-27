import { useCallback, useEffect, useRef, useState } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { importCalls } from '../api/importApi';
import type { ChatImport, SenderAssignment } from '../api/importTypes';
import { errorStatus, limitErrorText, parseErrorText, startErrorText } from './importErrors';
import { ImportLockedError, useLeaveWarning, useWakeLock, withImportLock } from './importGuards';
import { createImportReader, type ImportReader } from './importReader';
import { startRequest, type ImportTarget } from './importRequest';
import { noticeText } from './noticeText';
import { fileKeyOf } from './resumeStore';
import { ImportRunError, runImport, type ImportProgress } from './runImport';
import { suggestAssignments, type ImportMember } from './senderSuggestions';
import type { DateOrder, ParsedChat } from './types';
import { useImportResume } from './useImportResume';

export type ImportStep = 'file' | 'preview' | 'senders' | 'progress' | 'done';

export interface ImportDialogOptions {
  open: boolean;
  chatId?: EntityId;
  meId: EntityId;
  onDone?: (result: ChatImport) => void;
}

export const useImportDialog = ({ open, chatId, meId, onDone }: ImportDialogOptions) => {
  const { translations } = useLanguage();
  const t = translations.chatImport;
  const readerRef = useRef<ImportReader | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const runRef = useRef<{ importId: EntityId; uploaded: Record<string, EntityId> } | null>(null);
  const [step, setStep] = useState<ImportStep>('file');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [chat, setChat] = useState<ParsedChat | null>(null);
  const [target, setTarget] = useState<ImportTarget | null>(chatId === undefined ? null : { kind: 'chat', chatId });
  const [assignments, setAssignments] = useState<Record<string, SenderAssignment>>({});
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<ChatImport | null>(null);
  const resume = useImportResume(open, chatId);

  const running = step === 'progress' && !result && !error;
  useLeaveWarning(running);
  useWakeLock(running);

  const guarded = useCallback(async (run: () => Promise<void>) => {
    try {
      await withImportLock(run);
    } catch (caught) {
      if (!(caught instanceof ImportLockedError)) throw caught;
      setBusy(false);
      setError(t.errors.otherTab);
    }
  }, [t.errors.otherTab]);

  const reader = useCallback(() => {
    readerRef.current ??= createImportReader();
    return readerRef.current;
  }, []);

  useEffect(() => () => {
    abortRef.current?.abort();
    readerRef.current?.close();
    readerRef.current = null;
  }, []);

  const execute = useCallback(async (parsed: ParsedChat, importId: EntityId, fromIndex: number, uploaded: Record<string, EntityId>, record: {
    chatId: EntityId; fileKey: string;
  }) => {
    abortRef.current = new AbortController();
    runRef.current = { importId, uploaded };
    setStep('progress');
    setError(null);
    const base = { importId, chatId: record.chatId, title: parsed.title, source: parsed.source, total: parsed.messages.length, fileKey: record.fileKey };
    try {
      const done = await runImport({
        importId, chat: parsed, fromIndex, uploaded, signal: abortRef.current.signal,
        noticeText: (notice) => noticeText(notice, translations),
        stickerPackTitle: t.stickerPack,
        onProgress: setProgress,
        onUploaded: (next) => {
          runRef.current = { importId, uploaded: next };
          resume.remember({ ...base, uploaded: next });
        },
      }, (path) => reader().file(path));
      resume.forget();
      setResult(done);
      setStep('done');
      onDone?.(done);
    } catch (caught) {
      if (caught instanceof ImportRunError && caught.code === 'cancelled') return;
      setError(t.errors.stopped);
    }
  }, [onDone, reader, resume, t.errors.stopped, t.stickerPack, translations]);

  const chooseFiles = useCallback(async (picked: File[]) => {
    if (!picked.length) return;
    setBusy(true);
    setError(null);
    try {
      const parsed = await reader().open(picked);
      const limit = limitErrorText(parsed, t);
      if (limit) {
        setError(limit);
        return;
      }
      setFiles(picked);
      setChat(parsed);
      setTarget((current) => current ?? { kind: 'newGroup', title: parsed.title });
      const pending = resume.pending;
      if (!pending) setStep('preview');
      else if (pending.record.fileKey !== fileKeyOf(picked)) setError(t.errors.wrongFile);
      else {
        const { record, current } = pending;
        void guarded(() => execute(parsed, record.importId, current.next_index, record.uploaded, record));
      }
    } catch (caught) {
      setError(parseErrorText(caught, t));
    } finally {
      setBusy(false);
    }
  }, [execute, guarded, reader, resume.pending, t]);

  const reparse = useCallback(async (order: DateOrder, timeZone?: string) => {
    setBusy(true);
    try {
      setChat(await reader().reparse(order, timeZone));
    } finally {
      setBusy(false);
    }
  }, [reader]);
  const switchDateOrder = useCallback((order: DateOrder) => reparse(order, chat?.timeZone), [chat?.timeZone, reparse]);
  const switchTimeZone = useCallback((timeZone: string) => reparse(chat?.dateOrder ?? 'dmy', timeZone), [chat?.dateOrder, reparse]);

  const start = useCallback(async () => {
    if (!chat || !target) return;
    setBusy(true);
    setError(null);
    await guarded(async () => {
      let chatId = target.kind === 'chat' ? target.chatId : null;
      if (chatId === null) {
        const group = await importCalls.createGroup(chat.title.slice(0, 64));
        if (group.error) {
          setBusy(false);
          setError(t.errors.startFailed);
          return;
        }
        chatId = group.data.id;
        setTarget({ kind: 'chat', chatId });
      }
      const started = await importCalls.start(chatId, startRequest(chat, assignments));
      setBusy(false);
      if (started.error) {
        setError(startErrorText(started.error, t));
        return;
      }
      const record = { chatId: started.data.chat_id, fileKey: fileKeyOf(files) };
      resume.remember({ ...record, importId: started.data.id, title: chat.title, source: chat.source, total: chat.messages.length, uploaded: {} });
      await execute(chat, started.data.id, 0, {}, record);
    });
  }, [assignments, chat, execute, files, guarded, resume, t, target]);

  const retry = useCallback(async () => {
    const run = runRef.current;
    if (!chat || !run) return;
    const { importId, uploaded } = run;
    const current = await importCalls.get(importId);
    if (current.error) {
      setError(t.errors.stopped);
      return;
    }
    const record = { chatId: current.data.chat_id, fileKey: fileKeyOf(files) };
    void guarded(() => execute(chat, importId, current.data.next_index, uploaded, record));
  }, [chat, execute, files, guarded, t.errors.stopped]);

  const pause = useCallback(() => {
    abortRef.current?.abort();
    setError(t.stop.paused);
  }, [t.stop.paused]);

  const stopAndRemove = useCallback(async () => {
    abortRef.current?.abort();
    const run = runRef.current;
    if (run) {
      const removed = await importCalls.remove(run.importId);
      if (removed.error && errorStatus(removed.error) !== 404) {
        setError(t.stop.removeFailed);
        return false;
      }
    }
    resume.forget();
    return true;
  }, [resume, t.stop.removeFailed]);

  const toSenders = useCallback((members: readonly ImportMember[]) => {
    if (!chat) return;
    setAssignments(suggestAssignments(chat.senders, members, meId));
    setStep('senders');
  }, [chat, meId]);

  return {
    step, setStep, busy, error, chat, target, setTarget, assignments, setAssignments, progress, result, running,
    pending: resume.pending, discardPending: resume.discard, chooseFiles, switchDateOrder, switchTimeZone, toSenders, start, retry, pause, stopAndRemove,
  };
};
