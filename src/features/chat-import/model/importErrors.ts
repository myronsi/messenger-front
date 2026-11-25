import type { Translations } from '@/shared/contexts/LanguageContext';
import { problemCode } from '@/shared/api/problem';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { errorStatus } from '../api/importFetch';
import { ImportParseError, MAX_IMPORT_FILES, MAX_IMPORT_MESSAGES, type ParsedChat } from './types';

type Texts = Translations['chatImport'];

export const parseErrorText = (error: unknown, t: Texts) => (error instanceof ImportParseError ? t.errors[error.code] : t.errors.brokenFile);

export const limitErrorText = (chat: ParsedChat, t: Texts) => {
  if (chat.messages.length > MAX_IMPORT_MESSAGES) return fillTemplate(t.errors.tooManyMessages, { count: MAX_IMPORT_MESSAGES.toLocaleString() });
  if (chat.fileCount > MAX_IMPORT_FILES) return fillTemplate(t.errors.tooManyFiles, { count: MAX_IMPORT_FILES.toLocaleString() });
  return null;
};

export const startErrorText = (error: unknown, t: Texts) => {
  const code = problemCode(error) ?? '';
  if (code.includes('overlap')) return t.errors.overlap;
  if (code.includes('running')) return t.errors.running;
  return errorStatus(error) === 403 ? t.errors.notAllowed : t.errors.startFailed;
};
