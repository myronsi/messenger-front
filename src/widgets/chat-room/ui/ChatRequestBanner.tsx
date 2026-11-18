import { useState } from 'react';
import { useGetUserByUsernameQuery } from '@/entities/user';
import { ReportUserDialog } from '@/features/moderation';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { Button } from '@/shared/ui/button';
import { EmojiText } from '@/shared/ui/CustomEmoji';
import type { Translations } from '@/shared/contexts/LanguageContext';

interface ChatRequestBannerProps {
  request: { busy: boolean; accept: () => void; remove: () => void; block: () => void };
  chatName: string;
  displayName: string;
  avatar: string;
  translations: Translations;
  onOpenProfile: () => void;
}

const ChatRequestBanner = ({ request, chatName, displayName, avatar, translations, onOpenProfile }: ChatRequestBannerProps) => {
  const t = translations.chatOrganizer;
  const [reporting, setReporting] = useState(false);
  const { data: peer } = useGetUserByUsernameQuery(chatName, { skip: !chatName });
  const reported = (blocked: boolean) => {
    if (blocked) request.block();
  };
  const [before, after = ''] = t.requestBannerTitle.split('{name}');
  return (
    <div data-testid="chat-request-banner" className="shrink-0 border-b border-border bg-muted/40 px-4 py-3">
      <button type="button" onClick={onOpenProfile} className="flex w-full min-w-0 items-center gap-3 text-left">
        <AuthenticatedImage src={avatar} alt={displayName} className="h-10 w-10 shrink-0 rounded-full border border-border object-cover" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{before}<EmojiText text={displayName} />{after}</span>
          <span className="block truncate text-xs text-muted-foreground">@{chatName}</span>
        </span>
      </button>
      <p className="mt-2 text-xs text-muted-foreground">{t.requestBannerText}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" disabled={request.busy} onClick={request.accept}>{t.acceptRequest}</Button>
        <Button size="sm" variant="outline" disabled={request.busy} onClick={request.remove}>{t.deleteRequest}</Button>
        <Button size="sm" variant="destructive" disabled={request.busy || !peer?.id} onClick={() => setReporting(true)}>{t.reportAndBlockRequest}</Button>
      </div>
      {reporting && peer?.id && <ReportUserDialog userId={peer.id} name={displayName} onClose={() => setReporting(false)} onReported={reported} />}
    </div>
  );
};

export default ChatRequestBanner;
