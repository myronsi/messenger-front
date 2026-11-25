import { FileText, Link2 } from 'lucide-react';
import { findLinks, globalSearchText, richLabel, type FileMessageContent, type GlobalSearchHit } from '@/entities/message';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { VideoPlayBadge } from '@/shared/ui/VideoPlayBadge';
import { EmojiText } from '@/shared/ui/CustomEmoji';
import { formatFileSize } from '@/shared/lib/formatFileSize';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { hitParts } from '../model/searchHits';
import { chatAvatar, chatTitle, hitDate, senderLabel, type HitContext } from '../model/hitDisplay';
import { Highlighted } from './hitParts';

interface HitProps {
  hit: GlobalSearchHit;
  context: HitContext;
}

const attachment = (hit: GlobalSearchHit): FileMessageContent | null =>
  (hit.message.content && typeof hit.message.content === 'object' ? hit.message.content : null);

const RowMeta = ({ hit, context }: HitProps) => (
  <span className="flex min-w-0 items-center gap-2">
    <span className="min-w-0 flex-1 truncate text-[15px] font-medium leading-5">
      <EmojiText text={chatTitle(context.chatsById.get(hit.chatId), hit, context.translations)} />
    </span>
    <span className="shrink-0 text-xs text-muted-foreground">{hitDate(hit.message.timestamp, context.language)}</span>
  </span>
);

export const MessageHitRow = ({ hit, context }: HitProps) => {
  const avatar = chatAvatar(context.chatsById.get(hit.chatId), hit);
  const title = chatTitle(context.chatsById.get(hit.chatId), hit, context.translations);
  const sender = senderLabel(hit, context);
  const parts = hitParts(hit, context.query);
  const fallback = hit.message.sticker ? context.translations.globalSearch.sticker : richLabel(hit.message, context.translations) ?? '';
  return (
    <button type="button" data-testid="global-search-message" data-message-id={String(hit.message.id)} onClick={() => context.onOpen(hit)}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground">
      <AuthenticatedImage src={avatar.src} fallbackSrc={avatar.fallback} initialsFrom={title} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
      <span className="flex min-w-0 flex-1 flex-col">
        <RowMeta hit={hit} context={context} />
        <span className="mt-0.5 line-clamp-2 text-sm leading-5 text-muted-foreground">
          {sender && <span className="text-foreground"><EmojiText text={sender} />: </span>}
          {parts.length ? <Highlighted parts={parts} /> : fallback}
        </span>
      </span>
    </button>
  );
};

export const LinkHitRow = ({ hit, context }: HitProps) => {
  const links = findLinks(globalSearchText(hit.message)).slice(0, 2);
  return (
    <button type="button" data-testid="global-search-link" onClick={() => context.onOpen(hit)}
      className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Link2 className="h-5 w-5" /></span>
      <span className="flex min-w-0 flex-1 flex-col">
        <RowMeta hit={hit} context={context} />
        {links.map((link) => <span key={link} className="truncate text-sm text-primary">{link}</span>)}
        <span className="line-clamp-2 text-sm text-muted-foreground"><Highlighted parts={hitParts(hit, context.query)} /></span>
      </span>
    </button>
  );
};

export const FileHitRow = ({ hit, context }: HitProps) => {
  const file = attachment(hit);
  const size = file?.file_size ? formatFileSize(file.file_size, context.language, context.translations) : '';
  return (
    <button type="button" data-testid="global-search-file" onClick={() => context.onOpen(hit)}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="h-5 w-5" /></span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-medium leading-5">{file?.file_name || context.translations.fileMessagePreview}</span>
        <span className="truncate text-xs text-muted-foreground">
          {[size, chatTitle(context.chatsById.get(hit.chatId), hit, context.translations), hitDate(hit.message.timestamp, context.language)]
            .filter(Boolean).join(' · ')}
        </span>
      </span>
    </button>
  );
};

const isVideo = (file: FileMessageContent) => file.kind === 'video' || !!file.file_type?.startsWith('video/');

export const MediaTileButton = ({ hit, context }: HitProps) => {
  const file = attachment(hit);
  if (!file) return null;
  const video = isVideo(file);
  const label = video ? context.translations.globalSearch.video : context.translations.globalSearch.photo;
  return (
    <button type="button" data-testid="global-search-media" title={file.file_name} aria-label={`${label} ${file.file_name}`}
      onClick={() => context.onOpen(hit)} className="group relative aspect-square overflow-hidden bg-muted">
      <AuthenticatedImage src={resolveMediaUrl(file.thumbnail_url || file.display_url || file.file_url)} alt=""
        className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" />
      {video && <VideoPlayBadge size="sm" className="absolute inset-0 m-auto" />}
    </button>
  );
};

export const MediaGrid = ({ hits, context }: { hits: GlobalSearchHit[]; context: HitContext }) => (
  <div className="grid grid-cols-3 gap-0.5 px-0.5">
    {hits.map((hit) => <MediaTileButton key={`${hit.chatId}|${String(hit.message.id)}`} hit={hit} context={context} />)}
  </div>
);
