import React from 'react';
import { MessageSquare } from 'lucide-react';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { parseUtcDate } from '@/shared/utils/dateFormatters';
import { localeOf } from '@/shared/lang/languages';

export interface ViewerImageInfo {
  sender: string;
  avatarName?: string;
  avatarUrl?: string;
  sentAt?: string;
}

interface ImageViewerHeaderProps {
  info?: ViewerImageInfo;
  index: number;
  total: number;
  onShowInChat?: () => void;
  onClose?: () => void;
}

const formatSentAt = (value: string, language: string) => {
  const date = parseUtcDate(value);
  if (Number.isNaN(date.getTime())) return '';
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat(localeOf(language), {
    day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }), hour: '2-digit', minute: '2-digit',
  }).format(date);
};

const ImageViewerHeader: React.FC<ImageViewerHeaderProps> = ({ info, index, total, onShowInChat, onClose }) => {
  const { language, translations } = useLanguage();
  const showInChat = onShowInChat && (
    <button type="button" onClick={() => { onClose?.(); onShowInChat(); }} aria-label={translations.showInChat}
      className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-black/30 px-3 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/50">
      <MessageSquare className="h-4 w-4" aria-hidden="true" />
      <span className="max-sm:sr-only">{translations.showInChat}</span>
    </button>
  );
  const counter = total > 1 ? `${index + 1} / ${total}` : '';
  if (!info) {
    if (!counter && !showInChat) return null;
    return (
      <div className="fixed left-4 top-4 z-[10000] flex items-center gap-2">
        {counter && <div aria-live="polite" className="rounded-full bg-black/30 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">{counter}</div>}
        {showInChat}
      </div>
    );
  }
  const sentAt = info.sentAt ? formatSentAt(info.sentAt, language) : '';
  return (
    <div className="fixed left-4 top-4 z-[10000] flex max-w-[calc(100%-11rem)] items-center gap-2 sm:max-w-[calc(100%-16rem)]">
      <div data-testid="image-viewer-info" aria-live="polite" className="flex min-w-0 items-center gap-2.5 rounded-full bg-black/30 py-1 pl-1 pr-3 text-white backdrop-blur-sm">
        <AuthenticatedImage src={resolveMediaUrl(info.avatarUrl)} alt="" initialsFrom={info.avatarName || info.sender} className="h-8 w-8 shrink-0 rounded-full object-cover" />
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-semibold">{info.sender}</div>
          {(sentAt || counter) && <div className="truncate text-xs text-white/75">{[sentAt, counter].filter(Boolean).join(' · ')}</div>}
        </div>
      </div>
      {showInChat}
    </div>
  );
};

export default ImageViewerHeader;
