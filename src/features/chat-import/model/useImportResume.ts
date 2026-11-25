import { useCallback, useEffect, useState } from 'react';
import type { EntityId } from '@/shared/api/entityId';
import { importCalls } from '../api/importApi';
import { errorStatus } from './importErrors';
import type { ChatImport } from '../api/importTypes';
import { clearResume, loadResume, saveResume, type ResumeRecord } from './resumeStore';

export interface PendingImport {
  record: ResumeRecord;
  current: ChatImport;
}

export const useImportResume = (open: boolean, chatId?: EntityId) => {
  const [pending, setPending] = useState<PendingImport | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const record = loadResume();
    if (!record || (chatId !== undefined && String(record.chatId) !== String(chatId))) {
      setPending(null);
      return undefined;
    }
    const controller = new AbortController();
    void importCalls.get(record.importId, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result.error) {
        if (errorStatus(result.error) === 404) clearResume();
        setPending(null);
      } else if (result.data.state !== 'running') {
        clearResume();
        setPending(null);
      } else setPending({ record, current: result.data });
    });
    return () => controller.abort();
  }, [chatId, open]);

  const remember = useCallback((record: ResumeRecord) => saveResume(record), []);

  const forget = useCallback(() => {
    clearResume();
    setPending(null);
  }, []);

  const discard = useCallback(async () => {
    if (!pending) return false;
    const result = await importCalls.remove(pending.record.importId);
    if (result.error && errorStatus(result.error) !== 404) return false;
    clearResume();
    setPending(null);
    return true;
  }, [pending]);

  return { pending, remember, forget, discard };
};
