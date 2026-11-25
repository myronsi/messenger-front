import type { Translations } from '@/shared/contexts/LanguageContext';
import { fillTemplate } from '@/shared/lib/fillTemplate';
import type { AttachmentKind, ParsedNotice } from './types';

const KINDS: readonly string[] = ['image', 'video', 'audio', 'voice', 'sticker', 'file'];

const duration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes >= 60 ? `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
    : `${minutes}:${String(rest).padStart(2, '0')}`;
};

export const noticeText = (notice: ParsedNotice, translations: Translations) => {
  const t = translations.chatImport;
  const values = { detail: notice.detail, actor: notice.actor ?? '' };
  switch (notice.code) {
    case 'service':
      return notice.detail;
    case 'mediaOmitted':
      if (!notice.detail) return t.notices.mediaOmittedAny;
      return fillTemplate(t.notices.mediaOmitted, { detail: KINDS.includes(notice.detail) ? t.kinds[notice.detail as AttachmentKind] : notice.detail });
    case 'call': {
      const seconds = Number(notice.detail);
      return seconds > 0 ? fillTemplate(t.notices.callDuration, { detail: duration(seconds) }) : t.notices.call;
    }
    default:
      return fillTemplate(t.notices[notice.code], values);
  }
};
