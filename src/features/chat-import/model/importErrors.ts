import type { Translations } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import { ImportParseError, MAX_IMPORT_FILES, MAX_IMPORT_MESSAGES, MAX_IMPORT_SENDERS, type ParsedChat } from './types';

type Texts = Translations['chatImport'];

export const errorStatus = (error: unknown) => (error as { status?: unknown } | null)?.status;

export const parseErrorText = (error: unknown, t: Texts) => (error instanceof ImportParseError ? t.errors[error.code] : t.errors.brokenFile);

export const limitErrorText = (chat: ParsedChat, t: Texts) => {
  if (chat.messages.length > MAX_IMPORT_MESSAGES) return fillTemplate(t.errors.tooManyMessages, { count: MAX_IMPORT_MESSAGES.toLocaleString() });
  if (chat.fileCount > MAX_IMPORT_FILES) return fillTemplate(t.errors.tooManyFiles, { count: MAX_IMPORT_FILES.toLocaleString() });
  if (chat.senders.length > MAX_IMPORT_SENDERS) return fillTemplate(t.errors.tooManySenders, { count: MAX_IMPORT_SENDERS.toLocaleString() });
  return null;
};

export const problemMessages = (error: unknown) => {
  const errors = ((error as { data?: { errors?: unknown } } | null)?.data?.errors);
  return Array.isArray(errors) ? errors.map((item) => String((item as { message?: unknown } | null)?.message ?? '')).join(' ') : '';
};

export const startErrorText = (error: unknown, t: Texts) => {
  const status = errorStatus(error);
  if (status === 403) return t.errors.notAllowed;
  if (status !== 409) return t.errors.startFailed;
  const message = problemMessages(error);
  if (/period/i.test(message)) return t.errors.overlap;
  if (/running/i.test(message)) return t.errors.running;
  return /room/i.test(message) ? t.errors.noRoom : t.errors.startFailed;
};
