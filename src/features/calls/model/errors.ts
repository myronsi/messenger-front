import { callErrorCode, callErrorStatus } from '../api/callErrors';
import type { CallNotice } from './stores';

export class CallFailure extends Error {
  constructor(readonly notice: CallNotice) {
    super(notice);
    this.name = 'CallFailure';
  }
}

const CODE_NOTICES: Record<string, CallNotice> = {
  call_full: 'full',
  call_ended: 'ended',
  calls_unavailable: 'unavailable',
  calls_not_allowed: 'not-allowed',
  blocked_by_user: 'not-allowed',
  forbidden: 'not-allowed',
  rate_limited: 'rate-limited',
};

export const noticeForError = (error: unknown): CallNotice => {
  if (error instanceof CallFailure) return error.notice;
  const code = callErrorCode(error);
  if (code && CODE_NOTICES[code]) return CODE_NOTICES[code];
  const status = callErrorStatus(error);
  if (status === 404) return 'ended';
  if (status === 429) return 'rate-limited';
  if (status === 503) return 'unavailable';
  return 'failed';
};
