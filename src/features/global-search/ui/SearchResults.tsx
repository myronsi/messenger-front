import { Clock, CloudOff } from 'lucide-react';
import { messageHasKind, type Chat, type GlobalSearchHit } from '@/entities/message';
import type { useGlobalSearch } from '../model/useGlobalSearch';
import type { SearchTab } from '../model/searchFilters';
import { hitKey } from '../model/searchHits';
import type { HitContext } from '../model/hitDisplay';
import { useChatsPeople } from '../model/useChatsPeople';
import { ChatsPeopleSection } from './ChatsPeopleSection';
import { FileHitRow, LinkHitRow, MediaGrid, MessageHitRow } from './HitRows';
import { SectionTitle, SeeAll } from './hitParts';

const ALL_MESSAGES = 20;
const ALL_MEDIA = 6;
const ALL_ROWS = 3;

type SearchState = ReturnType<typeof useGlobalSearch>;

interface RecentProps {
  items: string[];
  context: HitContext;
  onPick: (query: string) => void;
  onClear: () => void;
}

export const RecentSearches = ({ items, context, onPick, onClear }: RecentProps) => {
  const t = context.translations.globalSearch;
  return (
    <section data-testid="global-search-recent">
      <SectionTitle title={t.recent} action={items.length ? <SeeAll label={t.clearRecent} onClick={onClear} /> : undefined} />
      {items.length ? items.map((item) => (
        <button type="button" key={item} data-testid="global-search-recent-item" onClick={() => onPick(item)}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-2 text-left text-[15px] transition-colors hover:bg-accent hover:text-accent-foreground">
          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate">{item}</span>
        </button>
      )) : <p className="px-4 py-2 text-sm text-muted-foreground">{t.noRecent}</p>}
    </section>
  );
};

const Note = ({ text, icon = false }: { text: string; icon?: boolean }) => (
  <p role="status" className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
    {icon && <CloudOff className="h-4 w-4 shrink-0" aria-hidden="true" />}
    {text}
  </p>
);

export const SearchNotes = ({ search, context }: { search: SearchState; context: HitContext }) => {
  const t = context.translations.globalSearch;
  if (search.localOnly) {
    return (
      <div data-testid="global-search-on-device" title={t.onDeviceHint}
        className="mx-4 mt-2 flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground">
        <CloudOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="font-medium">{t.onDevice}</span>
        <span className="truncate">{t.onDeviceHint}</span>
      </div>
    );
  }
  return search.failed ? <Note text={t.serverFailed} icon /> : null;
};

const HitList = ({ tab, hits, context }: { tab: SearchTab; hits: GlobalSearchHit[]; context: HitContext }) => {
  if (tab === 'media') return <MediaGrid hits={hits} context={context} />;
  const Row = tab === 'links' ? LinkHitRow : tab === 'files' ? FileHitRow : MessageHitRow;
  return <div className="px-1">{hits.map((hit) => <Row key={hitKey(hit)} hit={hit} context={context} />)}</div>;
};

const Footer = ({ search, empty, context, busy = false }: { search: SearchState; empty: boolean; context: HitContext; busy?: boolean }) => {
  const t = context.translations.globalSearch;
  if (search.loading || (empty && busy)) return <Note text={empty ? t.loading : t.loadingMore} />;
  return empty ? <Note text={t.nothingFound} /> : null;
};

interface AllResultsProps {
  search: SearchState;
  chats: Chat[];
  currentUsername: string;
  context: HitContext;
  onTab: (tab: SearchTab) => void;
  onOpenChat: (chat: Chat) => void;
  onOpenUser: (username: string) => void;
}

const AllResults = ({ search, chats, currentUsername, context, onTab, onOpenChat, onOpenUser }: AllResultsProps) => {
  const t = context.translations.globalSearch;
  const { hits } = search;
  const media = hits.filter((hit) => messageHasKind(hit.message, 'visual'));
  const links = hits.filter((hit) => messageHasKind(hit.message, 'link'));
  const files = hits.filter((hit) => messageHasKind(hit.message, 'file'));
  const found = useChatsPeople(context.query, chats, context.translations);
  const seeAll = (tab: SearchTab) => <SeeAll label={t.seeAll} onClick={() => onTab(tab)} />;
  return (
    <>
      <ChatsPeopleSection found={found} currentUsername={currentUsername} translations={context.translations}
        onOpenChat={onOpenChat} onOpenUser={onOpenUser} />
      {hits.length > 0 && (
        <section data-testid="global-search-messages">
          <SectionTitle title={t.messages} action={hits.length > ALL_MESSAGES || search.hasMore ? seeAll('messages') : undefined} />
          <HitList tab="messages" hits={hits.slice(0, ALL_MESSAGES)} context={context} />
        </section>
      )}
      {media.length > 0 && (
        <section data-testid="global-search-media-preview">
          <SectionTitle title={t.media} action={seeAll('media')} />
          <HitList tab="media" hits={media.slice(0, ALL_MEDIA)} context={context} />
        </section>
      )}
      {links.length > 0 && (
        <section data-testid="global-search-links-preview">
          <SectionTitle title={t.links} action={seeAll('links')} />
          <HitList tab="links" hits={links.slice(0, ALL_ROWS)} context={context} />
        </section>
      )}
      {files.length > 0 && (
        <section data-testid="global-search-files-preview">
          <SectionTitle title={t.files} action={seeAll('files')} />
          <HitList tab="files" hits={files.slice(0, ALL_ROWS)} context={context} />
        </section>
      )}
      <Footer search={search} empty={!hits.length && found.empty} busy={found.loading} context={context} />
    </>
  );
};

interface SearchResultsProps extends AllResultsProps {
  tab: SearchTab;
  recent: string[];
  onPickRecent: (query: string) => void;
  onClearRecent: () => void;
}

export const SearchResults = ({ tab, recent, onPickRecent, onClearRecent, ...all }: SearchResultsProps) => {
  const { search, context } = all;
  if (!search.active) {
    if (tab === 'all') return <RecentSearches items={recent} context={context} onPick={onPickRecent} onClear={onClearRecent} />;
    return <Note text={context.translations.globalSearch.typeToSearch} />;
  }
  return (
    <>
      <SearchNotes search={search} context={context} />
      {tab === 'all' ? <AllResults {...all} /> : (
        <section data-testid={`global-search-tab-${tab}`} className="pt-1">
          <HitList tab={tab} hits={search.hits} context={context} />
          <Footer search={search} empty={!search.hits.length} context={context} />
        </section>
      )}
    </>
  );
};
