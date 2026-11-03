import React from 'react';
import { Loader2, Plus, Search, X } from 'lucide-react';
import type { User } from '@/entities/user';
import type { useLanguage } from '@/shared/contexts/LanguageContext';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';

type Translations = ReturnType<typeof useLanguage>['translations'];
type Person = Partial<Pick<User, 'id' | 'display_name' | 'avatar_url'>> & { username: string };

interface PrivacyExceptionsPageProps {
  hint: string;
  selected: Person[];
  candidates: Person[];
  query: string;
  onQueryChange: (query: string) => void;
  isSearching: boolean;
  isBusy: boolean;
  currentUsername: string;
  translations: Translations;
  getAvatarSrc: (avatarUrl?: string | null) => string;
  onAdd: (username: string) => void;
  onRemove: (username: string) => void;
  note?: string;
  searchable?: boolean;
}

const PersonRow: React.FC<{ person: Person; getAvatarSrc: (url?: string | null) => string; action: React.ReactNode }> = ({ person, getAvatarSrc, action }) => (
  <div className="flex items-center gap-3 px-4 py-2.5">
    <AuthenticatedImage src={getAvatarSrc(person.avatar_url)} alt={person.username} className="h-9 w-9 shrink-0 rounded-full object-cover" />
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-medium text-foreground">{person.display_name || person.username}</span>
      <span className="block truncate text-xs text-muted-foreground">@{person.username}</span>
    </span>
    {action}
  </div>
);

const PrivacyExceptionsPage: React.FC<PrivacyExceptionsPageProps> = ({
  hint, selected, candidates, query, onQueryChange, isSearching, isBusy, currentUsername, translations, getAvatarSrc,
  onAdd, onRemove, note, searchable = true,
}) => {
  const taken = new Set([currentUsername.toLowerCase(), ...selected.map((person) => person.username.toLowerCase())]);
  const available = candidates.filter((person) => !taken.has(person.username.toLowerCase()));
  const iconButton = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50';
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">{hint}</p>
      <section>
        <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{translations.privacyAdded} · {selected.length}</p>
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {selected.length ? selected.map((person) => (
            <PersonRow key={person.username} person={person} getAvatarSrc={getAvatarSrc} action={(
              <button type="button" disabled={isBusy} onClick={() => onRemove(person.username)} aria-label={`${translations.remove || 'Remove'} @${person.username}`}
                className={`${iconButton} text-muted-foreground hover:bg-destructive/10 hover:text-destructive`}>
                <X className="h-4 w-4" />
              </button>
            )} />
          )) : <p className="px-4 py-3 text-sm text-muted-foreground">{translations.privacyNobodyAdded}</p>}
        </div>
      </section>
      <section>
        <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{translations.privacyAddPeople}</p>
        {note && <p className="mb-2 px-1 text-xs text-muted-foreground">{note}</p>}
        {searchable && (
          <label className="mb-2 flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={translations.privacySearchPeople}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            {isSearching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </label>
        )}
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {available.length ? available.map((person) => (
            <PersonRow key={person.username} person={person} getAvatarSrc={getAvatarSrc} action={(
              <button type="button" disabled={isBusy} onClick={() => onAdd(person.username)} aria-label={`${translations.add || 'Add'} @${person.username}`}
                className={`${iconButton} bg-primary/10 text-primary hover:bg-primary/20`}>
                <Plus className="h-4 w-4" />
              </button>
            )} />
          )) : <p className="px-4 py-3 text-sm text-muted-foreground">{searchable && query.trim() ? translations.userNotFound : translations.noDmContacts}</p>}
        </div>
      </section>
    </div>
  );
};

export default PrivacyExceptionsPage;
