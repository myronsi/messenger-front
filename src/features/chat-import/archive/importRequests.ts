import type { DateOrder, ParsedChat } from '../model/types';
import { ImportParseError } from '../model/types';
import { openImportSession, type ImportSession } from './importSession';

export type ImportRequest =
  | { type: 'open'; files: File[]; localeOrder: DateOrder }
  | { type: 'reparse'; order: DateOrder; timeZone?: string }
  | { type: 'file'; path: string };

export type ImportResult = ParsedChat | File;

export interface ImportReply {
  id: number;
  result?: ImportResult;
  error?: string;
}

export const createRequestHandler = () => {
  let session: ImportSession | null = null;
  const current = () => {
    if (!session) throw new ImportParseError('noChatFile');
    return session;
  };
  return async (request: ImportRequest): Promise<ImportResult> => {
    switch (request.type) {
      case 'open':
        session = null;
        session = await openImportSession(request.files, { localeOrder: request.localeOrder });
        return session.chat;
      case 'reparse':
        return current().reparse(request.order, request.timeZone);
      case 'file':
        return current().file(request.path);
    }
  };
};

export const errorCode = (error: unknown) => (error instanceof ImportParseError ? error.code : 'brokenFile');
